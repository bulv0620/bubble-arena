import { expect, test } from 'vitest';
import { ReloadInput } from './ReloadInput';
import { LocalRifle } from './LocalRifle';
const event = (target: EventTarget, type: string, values = {}) => target.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), values));
function setup() {
  const input = new ReloadInput(), global = new EventTarget(), doc = Object.assign(new EventTarget(), { hidden: false });
  const detach = input.attach(global, doc);
  return { input, global, doc, detach };
}
test('short R edge survives keyup, repeat/hold does not retrigger, fresh press does', () => {
  const { input, global, detach } = setup();
  event(global, 'keydown', { code: 'KeyR' }); event(global, 'keyup', { code: 'KeyR' });
  expect(input.consume()).toBe(true); expect(input.consume()).toBe(false);
  event(global, 'keydown', { code: 'KeyR' }); expect(input.consume()).toBe(true);
  event(global, 'keydown', { code: 'KeyR', repeat: true }); event(global, 'keydown', { code: 'KeyR' });
  expect(input.consume()).toBe(false); detach();
});
test.each(['blur', 'Escape', 'hidden', 'detach'])('%s cancels queued input and repeated key cannot revive it', mode => {
  const { input, global, doc, detach } = setup(); event(global, 'keydown', { code: 'KeyR' });
  if (mode === 'Escape') event(global, 'keydown', { code: mode });
  else if (mode === 'hidden') { doc.hidden = true; event(doc, 'visibilitychange'); }
  else if (mode === 'detach') detach();
  else event(global, mode);
  expect(input.consume()).toBe(false); doc.hidden = false;
  event(global, 'keydown', { code: 'KeyR', repeat: true }); expect(input.consume()).toBe(false); detach();
});
test('modifiers/composition/hidden/editable ignored; reattach and stale cleanup do not leak listeners', () => {
  const { input, global, doc, detach } = setup();
  for (const values of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { isComposing: true }]) {
    event(global, 'keydown', { code: 'KeyR', ...values }); expect(input.consume()).toBe(false);
  }
  doc.hidden = true; event(global, 'keydown', { code: 'KeyR' }); expect(input.consume()).toBe(false); doc.hidden = false;
  const editable = Object.assign(new EventTarget(), { isContentEditable: true });
  const editEvent = Object.assign(new Event('keydown'), { code: 'KeyR' });
  Object.defineProperty(editEvent, 'target', { value: editable }); global.dispatchEvent(editEvent); expect(input.consume()).toBe(false);
  event(global, 'keydown', { code: 'KeyR' });
  const focusEvent = new Event('focusin'); Object.defineProperty(focusEvent, 'target', { value: editable });
  doc.dispatchEvent(focusEvent); expect(input.consume()).toBe(false);
  const other = new EventTarget(), detachOther = input.attach(other, doc); detach(); detach();
  event(global, 'keydown', { code: 'KeyR' }); expect(input.consume()).toBe(false);
  event(other, 'keydown', { code: 'KeyR' }); expect(input.consume()).toBe(true);
  detachOther(); event(other, 'keydown', { code: 'KeyR' }); expect(input.consume()).toBe(false);
});
test('real R input plus rifle publishes only reload boundaries; held key cannot refill automatically', () => {
  const { input, global, detach } = setup(), rifle = new LocalRifle(); let notifications = 0;
  const unsubscribe = rifle.subscribe(() => notifications++);
  rifle.step({ held: false, pressed: true });
  event(global, 'keydown', { code: 'KeyR' });
  rifle.step({ held: true, pressed: false }, input.consume());
  expect(rifle.getSnapshot().reloading).toBe(true);
  event(global, 'blur');
  for (let i = 0; i < 120; i++) rifle.step({ held: false, pressed: false }, input.consume());
  expect(rifle.getSnapshot()).toMatchObject({ magazine: 30, reserve: 119, reloading: false });
  expect(notifications).toBe(3);
  rifle.step({ held: true, pressed: false });
  event(global, 'keydown', { code: 'KeyR', repeat: true });
  rifle.step({ held: false, pressed: false }, input.consume()); expect(rifle.getSnapshot().reloading).toBe(false);
  unsubscribe(); detach();
});
