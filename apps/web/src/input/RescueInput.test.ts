import { expect, test, vi } from 'vitest';
import { RescueInput } from './RescueInput';
const event = (target: EventTarget, type: string, values = {}) => target.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), values));
function fixture() {
  const input = new RescueInput(), global = new EventTarget(), canvas = new EventTarget(), doc = Object.assign(new EventTarget(), { hidden: false });
  let enabled = true;
  const cancel = vi.fn(), detach = input.attach(canvas, global, doc, () => enabled, cancel);
  return { input, global, canvas, doc, cancel, detach, disable: () => { enabled = false; } };
}
test('E held is not a short-click queue, repeat cannot revive cleared intent; rapid interruption keys survive until one poll', () => {
  const f = fixture(); event(f.global, 'keydown', { code: 'KeyE' }); expect(f.input.consume().held).toBe(true);
  event(f.global, 'keydown', { code: 'KeyW' }); event(f.global, 'keyup', { code: 'KeyW' });
  expect(f.input.consume().move).toBe(true); expect(f.input.consume().move).toBe(false);
  event(f.global, 'keyup', { code: 'KeyE' }); expect(f.input.consume().held).toBe(false);
  event(f.global, 'keydown', { code: 'KeyE', repeat: true }); expect(f.input.consume().held).toBe(false); f.detach();
});
test.each(['blur', 'escape', 'hidden', 'detach'] as const)('%s clears E/actions and calls synchronous progress cancellation', reason => {
  const f = fixture(); event(f.global, 'keydown', { code: 'KeyE' }); event(f.canvas, 'mousedown', { button: 0 });
  if (reason === 'blur') event(f.global, 'blur');
  if (reason === 'escape') event(f.global, 'keydown', { code: 'Escape' });
  if (reason === 'hidden') { f.doc.hidden = true; event(f.doc, 'visibilitychange'); }
  if (reason === 'detach') { f.detach(); f.detach(); }
  expect(f.input.consume()).toMatchObject({ held: false, fire: false }); expect(f.cancel).toHaveBeenCalled(); f.detach();
});
test('all action attempts are captured independently of weapon gates, with held/released mouse and keyboard state', () => {
  const f = fixture();
  for (const code of ['Space', 'KeyR', 'Digit2']) event(f.global, 'keydown', { code });
  event(f.canvas, 'mousedown', { button: 0 }); event(f.canvas, 'mousedown', { button: 2 });
  expect(f.input.consume()).toMatchObject({ jump: true, reload: true, weaponSwitch: true, fire: true, aim: true });
  for (const code of ['Space', 'KeyR', 'Digit2']) event(f.global, 'keyup', { code });
  event(f.global, 'mousemove', { buttons: 0 }); expect(f.input.consume()).toMatchObject({ jump: false, reload: false, weaponSwitch: false, fire: false, aim: false }); f.detach();
});
test('disabled/modified/editable input is ignored, fallback camera drag is not a fire attempt, stale cleanup does not remove current binding', () => {
  const f = fixture(); event(f.global, 'keydown', { code: 'KeyE', ctrlKey: true }); expect(f.input.consume().held).toBe(false);
  const editable = Object.assign(new EventTarget(), { closest: () => true });
  // A focus-in notification releases progress before another focused control can consume keys.
  event(f.global, 'keydown', { code: 'KeyE' });
  const focused = Object.defineProperty(new Event('focusin'), 'target', { value: editable });
  f.doc.dispatchEvent(focused); expect(f.input.consume().held).toBe(false); expect(f.cancel).toHaveBeenCalled();
  const typing = Object.defineProperty(Object.assign(new Event('keydown'), { code: 'KeyE' }), 'target', { value: editable });
  f.global.dispatchEvent(typing); expect(f.input.consume().held).toBe(false);
  f.disable(); event(f.global, 'keydown', { code: 'KeyE' }); expect(f.input.consume()).toMatchObject({ held: false, active: false });
  const newer = f.input.attach(f.canvas, f.global, f.doc, () => true, f.cancel, () => false); f.detach();
  event(f.global, 'keydown', { code: 'KeyE' }); event(f.canvas, 'mousedown', { button: 0 });
  expect(f.input.consume()).toMatchObject({ held: true, fire: false }); newer(); newer(); expect(f.input.consume().active).toBe(false);
});
