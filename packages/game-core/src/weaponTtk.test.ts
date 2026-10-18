import { expect, test } from 'vitest';
import { WEAPON_CONFIGS, WEAPON_HANDLING, WEAPON_DAMAGE_PROFILES, TRAINING_RIFLE_AMMO_POLICY, PHYSICS_CONFIG, type WeaponConfig, type WeaponId, type HitRegion } from '@bubble-arena/shared';
import { WeaponFireState } from './weaponFireState';
import { TrainingTargetState } from './trainingTargetState';
import { calculateWeaponDamage } from './weaponDamage';

/** Deterministic conditional TTK, assumes the stated number of pellets hit each shot. */
function ttk(id: WeaponId, region: HitRegion, distance: number, pellets = 1, overrides: Partial<WeaponConfig> = {}) {
  const config = { ...WEAPON_CONFIGS[id], ...overrides }, rule = new WeaponFireState(config, TRAINING_RIFLE_AMMO_POLICY, WEAPON_HANDLING[id].fireMode);
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
test('100HP conditional TTK at real maximum cadence reflects shotgun follow-up gain and two-round reload cadence without changing one-shot damage', () => {
  const cases = [
    { name: 'rifle-body-near', id: 'rifle', region: 'body', distance: 5, pellets: 1, ticks: 30 },
    { name: 'rifle-head-near', id: 'rifle', region: 'head', distance: 5, pellets: 1, ticks: 15 },
    { name: 'rifle-body-60m', id: 'rifle', region: 'body', distance: 60, pellets: 1, ticks: 68 },
    { name: 'shotgun-body-8-near', id: 'shotgun', region: 'body', distance: 5, pellets: 8, ticks: 0 },
    { name: 'shotgun-body-4-near', id: 'shotgun', region: 'body', distance: 5, pellets: 4, ticks: 12 },
    { name: 'shotgun-body-3-near', id: 'shotgun', region: 'body', distance: 5, pellets: 3, ticks: 52 },
    { name: 'shotgun-body-2-near', id: 'shotgun', region: 'body', distance: 5, pellets: 2, ticks: 64 },
    { name: 'shotgun-body-3-7m', id: 'shotgun', region: 'body', distance: 7, pellets: 3, ticks: 52 },
    { name: 'shotgun-body-8-10m', id: 'shotgun', region: 'body', distance: 10, pellets: 8, ticks: 12 },
    { name: 'shotgun-body-8-20m', id: 'shotgun', region: 'body', distance: 20, pellets: 8, ticks: 52 },
    { name: 'shotgun-body-8-25m', id: 'shotgun', region: 'body', distance: 25, pellets: 8, ticks: 104 },
    { name: 'shotgun-body-4-25m-reload', id: 'shotgun', region: 'body', distance: 25, pellets: 4, ticks: 208 },
    { name: 'sniper-body', id: 'sniper', region: 'body', distance: 90, pellets: 1, ticks: 75 },
    { name: 'sniper-head', id: 'sniper', region: 'head', distance: 90, pellets: 1, ticks: 0 },
    { name: 'bubble-contact', id: 'bubble', region: 'body', distance: 10, pellets: 1, ticks: 180 },
  ] as const;
  const rows = cases.map(c => {
    const current = ttk(c.id, c.region, c.distance, c.pellets);
    expect(current.ticks).toBe(c.ticks);
    const old = c.id === 'shotgun' ? ttk(c.id, c.region, c.distance, c.pellets, { fireRate: 20 / 9, magazineSize: 6, reloadDuration: 2.8 }) : current;
    return { name: c.name, ...current, oldSeconds: old.seconds };
  });
  expect(rows.find(row => row.name === 'shotgun-body-4-near')).toMatchObject({ shots: 2, seconds: .2, oldSeconds: .45 });
  expect(rows.find(row => row.name === 'shotgun-body-3-near')).toMatchObject({ shots: 3, ticks: 52, oldSeconds: .9 });
  expect(rows.find(row => row.name === 'shotgun-body-4-25m-reload')?.oldSeconds).toBeCloseTo(358 / 60);
});
