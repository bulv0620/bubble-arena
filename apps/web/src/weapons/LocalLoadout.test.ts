import { expect, test, vi } from 'vitest';
import { LocalLoadout } from './LocalLoadout';
const press = { held: true, pressed: true }, idle = { held: false, pressed: false };
test('fixed secondary and selected primary keep independent ammo and monotonic cross-weapon shot identities', () => {
  const loadout = new LocalLoadout(), listener = vi.fn(), release = loadout.subscribe(listener);
  expect(loadout.step(press)).toMatchObject({ sequence: 1, weapon: 'rifle' });
  expect(loadout.select(2)).toBe(true); expect(loadout.getSnapshot().active).toBe('bubble');
  expect(loadout.step(press)).toMatchObject({ sequence: 2, weapon: 'bubble' });
  expect(loadout.getWeaponAmmo('bubble').magazine).toBe(3); expect(loadout.getWeaponAmmo('rifle').magazine).toBe(29);
  loadout.setPrimary('shotgun'); expect(loadout.getSnapshot()).toMatchObject({ primary: 'shotgun', active: 'shotgun', scoped: false });
  expect(loadout.step(press)).toMatchObject({ sequence: 3, weapon: 'shotgun' });
  expect(loadout.getWeaponAmmo('shotgun').magazine).toBe(5);
  loadout.setPrimary('rifle'); expect(loadout.getSnapshot().ammo.magazine).toBe(29);
  expect(loadout.select(1)).toBe(false);
  release(); release(); const calls = listener.mock.calls.length; loadout.select(2); expect(listener).toHaveBeenCalledTimes(calls);
  expect(() => loadout.setPrimary('bubble' as 'rifle')).toThrow(TypeError);
  expect(() => loadout.select(3 as 1)).toThrow(TypeError);
});
test('switch cancels reload without refilling, preserves cooldown, and reloading idle secondary does not advance a canceled reload', () => {
  const loadout = new LocalLoadout('sniper'); loadout.setScoped(true);
  expect(loadout.getSpeed()).toBeCloseTo(2.8);
  loadout.step(press); loadout.step(idle, true); expect(loadout.getSnapshot().progress).toBe(0);
  loadout.select(2); expect(loadout.getWeaponAmmo('sniper')).toMatchObject({ magazine: 4, reloading: false });
  expect(loadout.getSnapshot().scoped).toBe(false); expect(loadout.getSpeed()).toBe(5.5);
  loadout.select(1); expect(loadout.step(press)).toBeNull();
  for (let i = 0; i < 80; i++) loadout.step(idle);
  expect(loadout.step(press)).toMatchObject({ weapon: 'sniper' });
  expect(loadout.getSnapshot().ammo.magazine).toBe(3);
  loadout.setScoped(true); loadout.setPrimary('rifle'); expect(loadout.getSnapshot().scoped).toBe(false);
});
test('bubble empty magazine auto reloads its four-shot capacity with unlimited training reserve', () => {
  const loadout = new LocalLoadout(); loadout.select(2);
  for (let shot = 0; shot < 4; shot++) {
    expect(loadout.step(press)).not.toBeNull();
    if (shot < 3) for (let i = 0; i < 60; i++) loadout.step(idle);
  }
  expect(loadout.getSnapshot().ammo).toMatchObject({ magazine: 0, reloading: true });
  loadout.select(1);
  for (let i = 0; i < 160; i++) loadout.step(idle);
  expect(loadout.getWeaponAmmo('bubble')).toMatchObject({ magazine: 0, reloading: false });
  loadout.select(2); expect(loadout.step(press)).toBeNull();
  expect(loadout.getSnapshot().ammo.reloading).toBe(true);
  for (let i = 0; i < 150; i++) loadout.step(idle);
  expect(loadout.getSnapshot().ammo).toMatchObject({ magazine: 4, reloading: false });
});
