import { expect, test } from 'vitest';
import { WEAPON_CONFIGS, WEAPON_HANDLING, WEAPON_DAMAGE_PROFILES, PHYSICS_CONFIG, weaponGroundSpeed } from '@bubble-arena/shared';
import { WeaponFireState } from './weaponFireState';
import { WeaponAccuracy } from './weaponAccuracy';
import { calculateWeaponDamage } from './weaponDamage';
import { HorizontalMovement } from './horizontalMovement';
const press = { held: true, pressed: true }, hold = { held: true, pressed: false }, idle = { held: false, pressed: false };
test.each(['shotgun', 'sniper', 'bubble'] as const)('%s is semi-auto and cannot repeat from held input or buffer cooldown clicks', id => {
  const rule = new WeaponFireState(WEAPON_CONFIGS[id], undefined, WEAPON_HANDLING[id].fireMode);
  expect(rule.step(press)).not.toBeNull(); expect(rule.step(press)).toBeNull();
  for (let i = 0; i < 150; i++) expect(rule.step(hold)).toBeNull();
  expect(rule.getState().magazine).toBe(WEAPON_CONFIGS[id].magazineSize - 1);
  rule.step(idle); expect(rule.step(press)).not.toBeNull();
});
test('cancel reload retains magazine and reserve while fire cooldown survives', () => {
  const rule = new WeaponFireState(WEAPON_CONFIGS.sniper, undefined, 'semi');
  rule.step(press); rule.step(idle, true); expect(rule.getState().reloading).toBe(true);
  expect(rule.cancelReload()).toBe(true); expect(rule.cancelReload()).toBe(false);
  expect(rule.getState()).toMatchObject({ magazine: 4, reserve: 20, reloading: false });
  expect(rule.step(press)).toBeNull();
  for (let i = 0; i < 80; i++) rule.step(idle);
  expect(rule.step(press)).not.toBeNull();
});
test('sniper scope selects accurate stationary/moving/airborne cones and its damage never falls off', () => {
  const accuracy = new WeaponAccuracy('sniper');
  expect(accuracy.getAngle()).toBeCloseTo(5 * Math.PI / 180);
  accuracy.setMotion(0, false, true); expect(accuracy.getAngle()).toBe(0);
  accuracy.setMotion(4, false, true); expect(accuracy.getAngle()).toBeCloseTo(.15 * Math.PI / 180);
  accuracy.setMotion(0, true, true); expect(accuracy.getAngle()).toBeCloseTo(.75 * Math.PI / 180);
  accuracy.setMotion(0, false); expect(accuracy.getAngle()).toBeCloseTo(5 * Math.PI / 180);
  for (const distance of [0, 20, 60, 100]) {
    expect(calculateWeaponDamage(80, WEAPON_DAMAGE_PROFILES.sniper, 'head', distance)).toBe(160);
    expect(calculateWeaponDamage(80, WEAPON_DAMAGE_PROFILES.sniper, 'body', distance)).toBe(80);
  }
  expect(() => accuracy.setMotion(NaN, false)).toThrow(RangeError);
});
test('shotgun has eight pellets with fast distance falloff; bubble has no head bonus', () => {
  expect(WEAPON_HANDLING.shotgun.pellets).toBe(8);
  expect(calculateWeaponDamage(8, WEAPON_DAMAGE_PROFILES.shotgun, 'body', 5) * 8).toBe(64);
  expect(calculateWeaponDamage(8, WEAPON_DAMAGE_PROFILES.shotgun, 'head', 5) * 8).toBe(96);
  expect(calculateWeaponDamage(8, WEAPON_DAMAGE_PROFILES.shotgun, 'body', 25)).toBe(2);
  expect(calculateWeaponDamage(25, WEAPON_DAMAGE_PROFILES.bubble, 'head', 40)).toBe(25);
});
test('ground movement reaches each held-weapon speed without recreating movement or changing jump rules', () => {
  const movement = new HorizontalMovement();
  for (const id of ['shotgun', 'rifle', 'sniper', 'bubble'] as const) {
    let result = { x: 0, y: 0, z: 0 };
    for (let i = 0; i < 60; i++) result = movement.step({ forward: true, backward: false, left: false, right: false }, 1, 0, weaponGroundSpeed(id) / 5);
    expect(Math.hypot(result.x, result.z) / PHYSICS_CONFIG.timeStep).toBeCloseTo(weaponGroundSpeed(id));
    expect(result.y).toBe(0);
  }
});
