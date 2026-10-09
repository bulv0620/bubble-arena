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
