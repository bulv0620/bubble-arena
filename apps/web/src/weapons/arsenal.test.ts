import { expect, test } from 'vitest';
import { WEAPON_IDS, WEAPON_CONFIGS, weaponSlot, weaponForSlot, type WeaponSlot } from '@bubble-arena/shared';
import { LocalLoadout } from './LocalLoadout';
import { WeaponSwitchInput } from './WeaponSwitchInput';
const press = { held: true, pressed: true }, idle = { held: false, pressed: false };
test('four fixed shared slots keep separate ammo/weight and respawn resets all without changing equip', () => {
  const loadout = new LocalLoadout();
  for (const id of WEAPON_IDS) {
    const slot = weaponSlot(id); expect(weaponForSlot(slot)).toBe(id);
    loadout.select(slot); expect(loadout.getSnapshot().active).toBe(id);
    expect(loadout.step(press)?.weapon).toBe(id);
    expect(loadout.getWeaponAmmo(id).magazine).toBe(WEAPON_CONFIGS[id].magazineSize - 1);
    expect(loadout.getSpeed()).toBeCloseTo(id === 'rifle' ? 6 : id === 'sniper' ? 4.8 : 6.6);
  }
  loadout.resetForRespawn(); expect(loadout.getSnapshot().active).toBe('bubble');
  for (const id of WEAPON_IDS) expect(loadout.getWeaponAmmo(id).magazine).toBe(WEAPON_CONFIGS[id].magazineSize);
  for (const slot of [0, 5, 1.5, NaN]) expect(() => loadout.select(slot as WeaponSlot)).toThrow(TypeError);
});
test('wheel intent is canvas-only, composes with digits/clicks, wraps and releases all handlers and pending input', () => {
  const global = new EventTarget(), canvas = new EventTarget(), doc = Object.assign(new EventTarget(), { hidden: false });
  const input = new WeaponSwitchInput(); let enabled = true;
  const detach = input.attach(global, doc, () => enabled, canvas);
  let time = 0;
  const wheel = (target = canvas, fields = {}) => { const event = Object.assign(new Event('wheel', { cancelable: true }), { deltaY: 100, ...fields }); Object.defineProperty(event, 'timeStamp', { value: time += 200 }); target.dispatchEvent(event); return event; };
  expect(wheel(global).defaultPrevented).toBe(false); expect(input.consume()).toBeNull();
  expect(wheel().defaultPrevented).toBe(true); expect(input.consume('bubble')).toBe(1);
  wheel(canvas, { deltaY: -1000 }); expect(input.consume('rifle')).toBe(4);
  wheel(); wheel(); expect(input.consume('rifle')).toBe(2);
  global.dispatchEvent(Object.assign(new Event('keydown', { cancelable: true }), { code: 'Digit3' }));
  wheel(); expect(input.consume()).toBe(4);
  wheel(); input.request(2); wheel(canvas, { deltaY: -100 }); expect(input.consume()).toBe(1);
  for (let i = 0; i < 1000; i++) wheel(); expect(input.consume()).toBe(2);
  for (const code of ['Digit1', 'Digit2', 'Numpad3', 'Numpad4']) {
    global.dispatchEvent(Object.assign(new Event('keydown', { cancelable: true }), { code }));
    expect(input.consume()).toBe(Number(code.at(-1)));
  }
  for (const fields of [{ deltaY: 0 }, { deltaY: NaN }, { ctrlKey: true }, { altKey: true }, { metaKey: true }]) expect(wheel(canvas, fields).defaultPrevented).toBe(false);
  enabled = false; expect(wheel().defaultPrevented).toBe(false); expect(input.consume()).toBeNull(); enabled = true;
  wheel(); doc.hidden = true; doc.dispatchEvent(new Event('visibilitychange')); expect(input.consume()).toBeNull();
  doc.hidden = false; wheel(); global.dispatchEvent(new Event('blur')); expect(input.consume()).toBeNull();
  input.request(4); detach(); detach(); expect(input.consume()).toBeNull(); wheel(); expect(input.consume()).toBeNull();
  expect(() => input.request(9 as WeaponSlot)).toThrow(TypeError);
});
test('weapon switching retains airborne spread and does not bypass cooldown or reload cancellation', () => {
  const loadout = new LocalLoadout('sniper'); loadout.setMotion(4, true); const airborne = loadout.getAngle();
  loadout.step(press); loadout.step(idle, true); loadout.select(2); loadout.select(3);
  expect(loadout.getAngle()).toBe(airborne); expect(loadout.getWeaponAmmo('sniper')).toMatchObject({ magazine: 4, reloading: false });
  expect(loadout.step(press)).toBeNull(); expect(loadout.canScope()).toBe(false);
  loadout.setRescuing(true);
  for (const slot of [1, 2, 3, 4] as const) expect(loadout.select(slot)).toBe(false);
  loadout.setRescuing(false); loadout.setLifeStatus('downed');
  for (const slot of [1, 2, 3, 4] as const) expect(loadout.select(slot)).toBe(false);
});
