import { expect, test } from 'vitest';
import { WEAPON_CONFIGS, WEAPON_HANDLING } from '@bubble-arena/shared';
import { WeaponFireState } from './weaponFireState';
test.each([['shotgun', 27], ['sniper', 75], ['bubble', 60]] as const)('%s cooldown follows real ticks and ends precisely at %s ticks', (id, ticks) => {
  const rule = new WeaponFireState(WEAPON_CONFIGS[id], undefined, WEAPON_HANDLING[id].fireMode);
  expect(rule.getFireCooldown()).toBeNull(); rule.step({ held: true, pressed: true });
  expect(rule.getFireCooldown()).toEqual({ progress: 0, remaining: ticks / 60 });
  for (let tick = 1; tick < ticks; tick++) {
    expect(rule.step({ held: false, pressed: false })).toBeNull();
    expect(rule.getFireCooldown()?.progress).toBeCloseTo(tick / ticks);
  }
  rule.step({ held: false, pressed: false }); expect(rule.getFireCooldown()).toBeNull();
  expect(rule.step({ held: true, pressed: true })).not.toBeNull(); expect(rule.getFireCooldown()?.progress).toBe(0);
});
