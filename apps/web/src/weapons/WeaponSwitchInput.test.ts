import { expect, test } from 'vitest';
import { WeaponSwitchInput } from './WeaponSwitchInput';
function key(global: EventTarget, code: string, overrides = {}) { global.dispatchEvent(Object.assign(new Event('keydown', { cancelable: true }), { code, ...overrides })); }
test('digits queue one last slot and settings/repeat/modifiers/hidden/focus/blur/cleanup suppress switching', () => {
  const global = new EventTarget(), doc = Object.assign(new EventTarget(), { hidden: false }), input = new WeaponSwitchInput();
  let enabled = true; const detach = input.attach(global, doc, () => enabled);
  key(global, 'Digit1'); key(global, 'Digit2'); expect(input.consume()).toBe(2); expect(input.consume()).toBeNull();
  key(global, 'Numpad1'); expect(input.consume()).toBe(1);
  for (const overrides of [{ repeat: true }, { ctrlKey: true }, { altKey: true }, { metaKey: true }, { isComposing: true }]) { key(global, 'Digit2', overrides); expect(input.consume()).toBeNull(); }
  enabled = false; key(global, 'Digit2'); expect(input.consume()).toBeNull(); enabled = true;
  key(global, 'Digit2'); global.dispatchEvent(new Event('blur')); expect(input.consume()).toBeNull();
  key(global, 'Digit2'); doc.hidden = true; doc.dispatchEvent(new Event('visibilitychange')); expect(input.consume()).toBeNull();
  doc.hidden = false; key(global, 'Digit2'); key(global, 'Escape'); expect(input.consume()).toBeNull();
  const editable = Object.assign(new Event('keydown'), { code: 'Digit2' }); Object.defineProperty(editable, 'target', { value: { closest: () => ({}) } });
  global.dispatchEvent(editable); expect(input.consume()).toBeNull();
  detach(); detach(); key(global, 'Digit2'); expect(input.consume()).toBeNull();
});
test('trackpad bursts quantize once, clear-on-equip retains throttle, reverse and later gestures work', () => {
  const global = new EventTarget(), canvas = new EventTarget(), doc = Object.assign(new EventTarget(), { hidden: false });
  const input = new WeaponSwitchInput(), oldDetach = input.attach(global, doc, () => true, canvas);
  const wheel = (deltaY: number, timeStamp: number, deltaMode = 0) => {
    const e = Object.assign(new Event('wheel', { cancelable: true }), { deltaY, deltaMode });
    Object.defineProperty(e, 'timeStamp', { value: timeStamp }); canvas.dispatchEvent(e);
  };
  for (let i = 0; i < 9; i++) wheel(4, i);
  expect(input.consume()).toBeNull(); wheel(4, 10); expect(input.consume()).toBe(2);
  input.clear(); for (let i = 11; i < 100; i++) wheel(4, i);
  expect(input.consume('shotgun')).toBeNull();
  wheel(-1, 100, 1); expect(input.consume('rifle')).toBe(4);
  wheel(1, 110, 2); expect(input.consume('bubble')).toBe(1);
  wheel(100, 400); expect(input.consume('rifle')).toBe(2);
  const detach = input.attach(global, doc, () => true, canvas);
  input.request(3); oldDetach(); expect(input.consume()).toBe(3);
  detach(); wheel(100, 600); expect(input.consume()).toBeNull();
});
