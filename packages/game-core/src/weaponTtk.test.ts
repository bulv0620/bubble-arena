import { expect, test } from 'vitest';
import { WEAPON_CONFIGS, WEAPON_HANDLING, WEAPON_DAMAGE_PROFILES, TRAINING_RIFLE_AMMO_POLICY, PHYSICS_CONFIG, type WeaponId, type HitRegion } from '@bubble-arena/shared';
import { WeaponFireState } from './weaponFireState';
import { TrainingTargetState } from './trainingTargetState';
import { calculateWeaponDamage } from './weaponDamage';

/** Deterministic conditional TTK, assumes the stated number of pellets hit each shot. */
function ttk(id: WeaponId, region: HitRegion, distance: number, pellets = 1, fireRate = WEAPON_CONFIGS[id].fireRate) {
  const config = WEAPON_CONFIGS[id], rule = new WeaponFireState({ ...config, fireRate }, TRAINING_RIFLE_AMMO_POLICY, WEAPON_HANDLING[id].fireMode);
  const target = new TrainingTargetState(), damage = calculateWeaponDamage(config.damage, WEAPON_DAMAGE_PROFILES[id], region, distance) * pellets;
  let shots = 0;
  for (let tick = 0; tick < 10_000; tick++) {
    const shot = rule.step({ held: WEAPON_HANDLING[id].fireMode === 'auto', pressed: WEAPON_HANDLING[id].fireMode === 'semi' });
    if (!shot) continue;
    shots++; target.receiveHit(shot, damage);
    if (target.getState().hp === 0) return { damage, shots, ticks: tick, seconds: tick / PHYSICS_CONFIG.tickRate };
  }
  throw new Error('TTK simulation did not finish');
}
test('100HP conditional TTK at real maximum cadence reflects shotgun follow-up gain without changing one-shot damage', () => {
  const cases = [
    { name: 'rifle-body-near', id: 'rifle', region: 'body', distance: 5, pellets: 1, ticks: 30 },
    { name: 'rifle-head-near', id: 'rifle', region: 'head', distance: 5, pellets: 1, ticks: 15 },
    { name: 'rifle-body-60m', id: 'rifle', region: 'body', distance: 60, pellets: 1, ticks: 68 },
    { name: 'shotgun-body-8-near', id: 'shotgun', region: 'body', distance: 5, pellets: 8, ticks: 0 },
    { name: 'shotgun-body-4-near', id: 'shotgun', region: 'body', distance: 5, pellets: 4, ticks: 27 },
    { name: 'shotgun-body-3-near', id: 'shotgun', region: 'body', distance: 5, pellets: 3, ticks: 54 },
    { name: 'shotgun-body-2-near', id: 'shotgun', region: 'body', distance: 5, pellets: 2, ticks: 81 },
    { name: 'shotgun-body-3-7m', id: 'shotgun', region: 'body', distance: 7, pellets: 3, ticks: 54 },
    { name: 'shotgun-body-8-10m', id: 'shotgun', region: 'body', distance: 10, pellets: 8, ticks: 27 },
    { name: 'shotgun-body-8-20m', id: 'shotgun', region: 'body', distance: 20, pellets: 8, ticks: 54 },
    { name: 'shotgun-body-8-25m', id: 'shotgun', region: 'body', distance: 25, pellets: 8, ticks: 108 },
    { name: 'shotgun-body-4-25m-reload', id: 'shotgun', region: 'body', distance: 25, pellets: 4, ticks: 358 },
    { name: 'sniper-body', id: 'sniper', region: 'body', distance: 90, pellets: 1, ticks: 75 },
    { name: 'sniper-head', id: 'sniper', region: 'head', distance: 90, pellets: 1, ticks: 0 },
    { name: 'bubble-contact', id: 'bubble', region: 'body', distance: 10, pellets: 1, ticks: 180 },
  ] as const;
  const rows = cases.map(c => {
    const current = ttk(c.id, c.region, c.distance, c.pellets);
    expect(current.ticks).toBe(c.ticks);
    const old = c.id === 'shotgun' ? ttk(c.id, c.region, c.distance, c.pellets, 1) : current;
    return { name: c.name, ...current, oldSeconds: old.seconds };
  });
  expect(rows.find(row => row.name === 'shotgun-body-4-near')).toMatchObject({ shots: 2, seconds: .45, oldSeconds: 1 });
  expect(rows.find(row => row.name === 'shotgun-body-3-near')).toMatchObject({ shots: 3, seconds: .9, oldSeconds: 2 });
  expect(rows.find(row => row.name === 'shotgun-body-4-25m-reload')?.oldSeconds).toBeCloseTo(589 / 60);
});
