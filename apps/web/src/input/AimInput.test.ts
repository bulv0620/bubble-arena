import { expect, test, vi } from 'vitest';
import { AimInput } from './AimInput';

function event(target: EventTarget, type: string, values = {}) {
  const e = Object.assign(new Event(type, { cancelable: true }), values);
  target.dispatchEvent(e);
  return e;
}
function setup() {
  const canvas = new EventTarget(), global = new EventTarget();
  const doc = Object.assign(new EventTarget(), { hidden: false, pointerLockElement: null as EventTarget | null });
  const input = new AimInput(), changed = vi.fn();
  const unsubscribe = input.subscribe(changed);
  const detach = input.attach(canvas, global, doc);
  const down = () => event(canvas, 'mousedown', { button: 2 });
  return { canvas, global, doc, input, changed, unsubscribe, detach, down };
}

test('right hold enters once, global release exits; left release does not cancel right hold', () => {
  const f = setup();
  expect(f.down().defaultPrevented).toBe(true); f.down();
  expect(f.input.getSnapshot()).toBe(true); expect(f.changed).toHaveBeenCalledTimes(1);
  event(f.global, 'mouseup', { button: 0 }); expect(f.input.getSnapshot()).toBe(true);
  event(f.global, 'mouseup', { button: 2 }); expect(f.input.getSnapshot()).toBe(false);
  expect(event(f.canvas, 'contextmenu').defaultPrevented).toBe(true);
  f.detach();
});

test.each(['escape', 'blur', 'hidden', 'loss', 'error', 'missing-button'])('%s cancels hold without automatic re-entry', reason => {
  const f = setup(); f.doc.pointerLockElement = f.canvas; f.down();
  if (reason === 'escape') event(f.global, 'keydown', { code: 'Escape' });
  if (reason === 'blur') event(f.global, 'blur');
  if (reason === 'hidden') { f.doc.hidden = true; event(f.doc, 'visibilitychange'); }
  if (reason === 'loss') { f.doc.pointerLockElement = null; event(f.doc, 'pointerlockchange'); }
  if (reason === 'error') event(f.doc, 'pointerlockerror');
  if (reason === 'missing-button') event(f.global, 'mousemove', { buttons: 0 });
  expect(f.input.getSnapshot()).toBe(false);
  f.doc.hidden = false; event(f.global, 'mousemove', { buttons: 2 });
  expect(f.input.getSnapshot()).toBe(false); f.detach();
});

test('canvas only, own lock or unlocked fallback, modifiers and hidden page guard', () => {
  const f = setup();
  for (const values of [{ button: 0 }, { button: 2, ctrlKey: true }, { button: 2, metaKey: true }, { button: 2, altKey: true }]) {
    event(f.canvas, 'mousedown', values); expect(f.input.getSnapshot()).toBe(false);
  }
  event(f.global, 'mousedown', { button: 2 }); expect(f.input.getSnapshot()).toBe(false);
  f.doc.hidden = true; f.down(); expect(f.input.getSnapshot()).toBe(false);
  f.doc.hidden = false; f.doc.pointerLockElement = new EventTarget(); f.down(); expect(f.input.getSnapshot()).toBe(false);
  f.doc.pointerLockElement = f.canvas; f.down(); expect(f.input.getSnapshot()).toBe(true);
  event(f.doc, 'pointerlockchange'); event(f.global, 'mousemove', { buttons: 2 });
  expect(f.input.getSnapshot()).toBe(true); f.detach();
});

test('detach clears, removes listeners, rebind/stale cleanup and unsubscribe are safe', () => {
  const f = setup(); f.down(); f.detach(); f.detach();
  f.down(); expect(f.input.getSnapshot()).toBe(false);
  expect(event(f.canvas, 'contextmenu').defaultPrevented).toBe(false);
  const detach = f.input.attach(f.canvas, f.global, f.doc); f.detach(); f.down();
  expect(f.input.getSnapshot()).toBe(true);
  f.unsubscribe(); f.changed.mockClear(); detach();
  expect(f.input.getSnapshot()).toBe(false); expect(f.changed).not.toHaveBeenCalled();
});
test('click-toggle survives release/motion, closes on second click, respects readiness and never queues a blocked reopen', () => {
  const canvas = new EventTarget(), global = new EventTarget(), doc = Object.assign(new EventTarget(), { hidden: false, pointerLockElement: null });
  const input = new AimInput(); let ready = true;
  const detach = input.attach(canvas, global, doc, () => true, () => true, () => ready);
  const click = () => { event(canvas, 'mousedown', { button: 2 }); event(global, 'mouseup', { button: 2 }); };
  click(); event(global, 'mousemove', { buttons: 0 }); expect(input.getSnapshot()).toBe(true);
  click(); expect(input.getSnapshot()).toBe(false);
  ready = false; click(); expect(input.getSnapshot()).toBe(false);
  ready = true; event(global, 'mousemove', { buttons: 0 }); expect(input.getSnapshot()).toBe(false);
  click(); expect(input.getSnapshot()).toBe(true); event(global, 'blur'); expect(input.getSnapshot()).toBe(false);
  click(); event(global, 'keydown', { code: 'Escape' }); expect(input.getSnapshot()).toBe(false);
  detach(); click(); expect(input.getSnapshot()).toBe(false);
});
