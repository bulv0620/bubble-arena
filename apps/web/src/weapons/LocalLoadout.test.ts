import { expect, test, vi } from 'vitest';
import { LocalLoadout } from './LocalLoadout';
const press = { held: true, pressed: true }, idle = { held: false, pressed: false };
test('two shotgun clicks at 0/12 ticks empty the chamber; 39-tick reload reserves completion and restores both rounds', () => {
  const gun = new LocalLoadout('shotgun');
  expect(gun.step(press)).toMatchObject({ tick: 0, weapon: 'shotgun' });
  expect(gun.getSnapshot()).toMatchObject({ ammo: { magazine: 1 }, cooldownRemaining: .2 });
  for (let tick = 1; tick < 12; tick++) expect(gun.step(press)).toBeNull();
  expect(gun.step(press)).toMatchObject({ tick: 12, sequence: 2 });
  expect(gun.getSnapshot()).toMatchObject({ ammo: { magazine: 0, reloading: true }, progress: 0 });
  for (let tick = 13; tick < 51; tick++) {
    expect(gun.step(press)).toBeNull(); expect(gun.getSnapshot().ammo.reloading).toBe(true);
  }
  expect(gun.step(press)).toBeNull(); // tick51 is reload completion, never an extra buffered shot.
  expect(gun.getSnapshot()).toMatchObject({ ammo: { magazine: 2, reloading: false }, progress: null });
  expect(gun.step(press)).toMatchObject({ tick: 52, sequence: 3 });
});
test('shotgun empty-reload switching cannot refill early; held input stays semi-auto after reload', () => {
  const gun = new LocalLoadout('shotgun'); gun.step(press);
  for (let i = 1; i < 12; i++) gun.step(idle);
  gun.step(press); gun.select(1); for (let i = 0; i < 60; i++) gun.step(idle);
  expect(gun.getWeaponAmmo('shotgun')).toMatchObject({ magazine: 0, reloading: false });
  gun.select(2); gun.step(idle);
  for (let i = 0; i < 39; i++) gun.step({ held: true, pressed: false });
  expect(gun.getWeaponAmmo('shotgun')).toMatchObject({ magazine: 2, reloading: false });
  for (let i = 0; i < 20; i++) expect(gun.step({ held: true, pressed: false })).toBeNull();
  expect(gun.step(press)).not.toBeNull(); expect(gun.getWeaponAmmo('shotgun').magazine).toBe(1);
});
test('four carried weapons keep independent ammo and monotonic cross-weapon shot identities', () => {
  const loadout = new LocalLoadout(), listener = vi.fn(), release = loadout.subscribe(listener);
  expect(loadout.step(press)).toMatchObject({ sequence: 1, weapon: 'rifle' });
  expect(loadout.select(4)).toBe(true); expect(loadout.getSnapshot().active).toBe('bubble');
  expect(loadout.step(press)).toMatchObject({ sequence: 2, weapon: 'bubble' });
  expect(loadout.getWeaponAmmo('bubble').magazine).toBe(3); expect(loadout.getWeaponAmmo('rifle').magazine).toBe(29);
  loadout.select(2); expect(loadout.getSnapshot()).toMatchObject({ active: 'shotgun', scoped: false });
  expect(loadout.step(press)).toMatchObject({ sequence: 3, weapon: 'shotgun' });
  expect(loadout.getWeaponAmmo('shotgun').magazine).toBe(1);
  loadout.select(1); expect(loadout.getSnapshot().ammo.magazine).toBe(29);
  expect(loadout.select(1)).toBe(false);
  release(); release(); const calls = listener.mock.calls.length; loadout.select(4); expect(listener).toHaveBeenCalledTimes(calls);
  expect(() => loadout.select(0 as 1)).toThrow(TypeError);
  expect(() => loadout.select(5 as 1)).toThrow(TypeError);
});
test('switch cancels reload without refilling, preserves cooldown, and reloading idle secondary does not advance a canceled reload', () => {
  const loadout = new LocalLoadout('sniper'); loadout.setScoped(true);
  expect(loadout.getSpeed()).toBeCloseTo(3.36);
  loadout.step(press); loadout.step(idle, true); expect(loadout.getSnapshot().progress).toBe(0);
  loadout.select(4); expect(loadout.getWeaponAmmo('sniper')).toMatchObject({ magazine: 4, reloading: false });
  expect(loadout.getSnapshot().scoped).toBe(false); expect(loadout.getSpeed()).toBeCloseTo(6.6);
  loadout.select(3); expect(loadout.step(press)).toBeNull();
  for (let i = 0; i < 80; i++) loadout.step(idle);
  expect(loadout.step(press)).toMatchObject({ weapon: 'sniper' });
  expect(loadout.getSnapshot().ammo.magazine).toBe(3);
  loadout.setScoped(true); loadout.select(1); expect(loadout.getSnapshot().scoped).toBe(false);
});
test('bubble empty magazine auto reloads its four-shot capacity with unlimited training reserve', () => {
  const loadout = new LocalLoadout(); loadout.select(4);
  for (let shot = 0; shot < 4; shot++) {
    expect(loadout.step(press)).not.toBeNull();
    if (shot < 3) for (let i = 0; i < 60; i++) loadout.step(idle);
  }
  expect(loadout.getSnapshot().ammo).toMatchObject({ magazine: 0, reloading: true });
  loadout.select(1);
  for (let i = 0; i < 160; i++) loadout.step(idle);
  expect(loadout.getWeaponAmmo('bubble')).toMatchObject({ magazine: 0, reloading: false });
  loadout.select(4); expect(loadout.step(press)).toBeNull();
  expect(loadout.getSnapshot().ammo.reloading).toBe(true);
  for (let i = 0; i < 150; i++) loadout.step(idle);
  expect(loadout.getSnapshot().ammo).toMatchObject({ magazine: 4, reloading: false });
});
test('sniper shot uses scoped accuracy then closes; cooldown blocks scope and rejects early fire without restarting progress', () => {
  const loadout = new LocalLoadout('sniper'); loadout.setScoped(true);
  expect(loadout.step(press)).toMatchObject({ angle: 0, weapon: 'sniper' });
  expect(loadout.getSnapshot()).toMatchObject({ scoped: false, cooldownProgress: 0, cooldownRemaining: 1.25 });
  loadout.setScoped(true); expect(loadout.getSnapshot().scoped).toBe(false);
  expect(loadout.step(press)).toBeNull(); expect(loadout.getSnapshot().cooldownProgress).toBeCloseTo(1 / 75);
  for (let tick = 2; tick < 75; tick++) loadout.step(idle);
  expect(loadout.canScope()).toBe(false); loadout.step(idle); expect(loadout.canScope()).toBe(true);
  expect(loadout.getSnapshot().scoped).toBe(false); // No automatic reopen.
  loadout.setScoped(true); expect(loadout.getSnapshot().scoped).toBe(true);
  loadout.step(idle, true); expect(loadout.getSnapshot().scoped).toBe(false); expect(loadout.canScope()).toBe(false);
});
test('switching never bypasses sniper cooldown and only semi-auto HUD exposes cooldown', () => {
  const loadout = new LocalLoadout('sniper'); loadout.step(press); loadout.select(4);
  for (let i = 0; i < 10; i++) loadout.step(idle);
  loadout.select(3); expect(loadout.getSnapshot().cooldownProgress).toBeCloseTo(10 / 75); expect(loadout.canScope()).toBe(false);
  loadout.select(1); loadout.step(press); expect(loadout.getSnapshot().cooldownProgress).toBeNull();
});

test('sprint keeps per-weapon weight and switching, refuses all shots/scopes, and clears on life/rescue gates',()=>{
 const gun=new LocalLoadout('sniper');gun.setScoped(true);expect(gun.getSnapshot().scoped).toBe(true);
 gun.setSprinting(true);expect(gun.getSnapshot()).toMatchObject({sprinting:true,scoped:false});expect(gun.canScope()).toBe(false);expect(gun.getSpeed()).toBeCloseTo(4.8*1.35);
 for(let t=0;t<90;t++)expect(gun.step({held:true,pressed:true})).toBeNull();expect(gun.getWeaponAmmo('sniper').magazine).toBe(5);
 expect(gun.select(2)).toBe(true);expect(gun.getSpeed()).toBeCloseTo(6.6*1.35);expect(gun.step({held:true,pressed:true})).toBeNull();
 gun.setSprinting(false);expect(gun.step({held:true,pressed:true})).not.toBeNull();
 gun.setSprinting(true);gun.setRescuing(true);expect(gun.getSnapshot().sprinting).toBe(false);gun.setSprinting(true);expect(gun.getSnapshot().sprinting).toBe(false);
 gun.setRescuing(false);gun.setSprinting(true);gun.setLifeStatus('downed');expect(gun.getSnapshot().sprinting).toBe(false);
});
