import { expect, test, vi } from 'vitest';
import { PointerLockInput } from '../camera';
import { AimInput } from '../input';
import { FireInput } from './FireInput';

function event(target: EventTarget, type: string, values = {}) {
  target.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), values));
}
function setup(supported = true) {
  const canvas = Object.assign(new EventTarget(), supported ? { requestPointerLock: () => {} } : {});
  const global = new EventTarget(), aim = new AimInput(), pointer = new PointerLockInput();
  const doc = Object.assign(new EventTarget(), { hidden: false, pointerLockElement: null as EventTarget | null,
    exitPointerLock: () => { doc.pointerLockElement = null; event(doc, 'pointerlockchange'); } });
  const fire = new FireInput(pointer, aim), changed = vi.fn();
  const unAim = aim.attach(canvas, global, doc);
  const unPointer = pointer.attach(canvas, global, doc, () => {}, () => { aim.clear(); fire.clear(); }, () => !aim.getSnapshot());
  const detach = fire.attach(canvas, global, doc), unsubscribe = fire.subscribe(changed);
  const down = () => event(canvas, 'mousedown', { button: 0 });
  const up = () => event(global, 'mouseup', { button: 0 });
  const lock = () => {
    event(canvas, 'click', { button: 0 }); doc.pointerLockElement = canvas; event(doc, 'pointerlockchange');
  };
  const cleanup = () => { detach(); unPointer(); unAim(); unsubscribe(); };
  return { canvas, global, doc, fire, aim, pointer, changed, detach, unsubscribe, down, up, lock, cleanup };
}

test('activation press is ignored; confirmed own lock accepts a single pulse plus held state', () => {
  const f = setup(); f.down();
  expect(f.fire.consume()).toEqual({ held: false, pressed: false });
  event(f.canvas, 'click', { button: 0 });
  f.down(); expect(f.fire.getSnapshot().held).toBe(false);
  f.doc.pointerLockElement = f.canvas; event(f.doc, 'pointerlockchange');
  f.down(); f.down();
  const snapshot = f.fire.getSnapshot();
  expect(snapshot).toEqual({ held: true, pressed: true });
  expect(Object.isFrozen(snapshot)).toBe(true);
  expect(f.changed).toHaveBeenCalledTimes(1);
  expect(f.fire.consume()).toEqual({ held: true, pressed: true });
  expect(f.fire.consume()).toEqual({ held: true, pressed: false });
  event(f.global, 'mouseup', { button: 2 });
  expect(f.fire.getSnapshot().held).toBe(true);
  f.up(); expect(f.fire.consume()).toEqual({ held: false, pressed: false }); f.cleanup();
});

test('short click survives release until consumed once; repeated clicks coalesce without a backlog', () => {
  const f = setup(); f.lock();
  for (let i = 0; i < 100; i++) { f.down(); f.up(); }
  expect(f.fire.consume()).toEqual({ held: false, pressed: true });
  expect(f.fire.consume()).toEqual({ held: false, pressed: false });
  f.down(); f.up(); expect(f.fire.consume().pressed).toBe(true); f.cleanup();
});

test.each(['blur', 'hidden', 'escape', 'external-loss', 'clear'])('%s clears held and queued intent; return never fires automatically', reason => {
  const f = setup(); f.lock(); f.down();
  if (reason === 'blur') event(f.global, 'blur');
  if (reason === 'hidden') { f.doc.hidden = true; event(f.doc, 'visibilitychange'); }
  if (reason === 'escape') event(f.global, 'keydown', { code: 'Escape' });
  if (reason === 'external-loss') { f.doc.pointerLockElement = null; event(f.doc, 'pointerlockchange'); }
  if (reason === 'clear') f.fire.clear();
  expect(f.fire.consume()).toEqual({ held: false, pressed: false });
  f.doc.hidden = false; event(f.global, 'focus'); event(f.global, 'mousemove', { buttons: 1 });
  expect(f.fire.consume()).toEqual({ held: false, pressed: false }); f.cleanup();
});

test.each([false, true])('fallback (supported=%s) protects drag and requires held aim; aim release cancels firing', supported => {
  const f = setup(supported);
  if (supported) { event(f.canvas, 'click', { button: 0 }); event(f.doc, 'pointerlockerror'); }
  f.down(); event(f.global, 'mousemove', { buttons: 1 });
  expect(f.fire.getSnapshot()).toEqual({ held: false, pressed: false });
  event(f.canvas, 'mousedown', { button: 2 }); f.down();
  expect(f.fire.getSnapshot()).toEqual({ held: true, pressed: true });
  event(f.global, 'mousemove', { buttons: 3 });
  expect(f.fire.getSnapshot().held).toBe(true);
  f.up(); event(f.canvas, 'click', { button: 0 });
  expect(f.pointer.getSnapshot()).toBe(supported ? 'error' : 'unsupported');
  expect(f.fire.getSnapshot()).toEqual({ held: false, pressed: true });
  event(f.global, 'mouseup', { button: 2 });
  expect(f.fire.consume()).toEqual({ held: false, pressed: false }); f.cleanup();
});

test('modifiers, another lock, outside canvas and hidden input cannot generate intents', () => {
  const f = setup(); f.lock();
  for (const values of [{ button: 2 }, { button: 0, ctrlKey: true }, { button: 0, altKey: true }, { button: 0, metaKey: true }]) {
    event(f.canvas, 'mousedown', values); expect(f.fire.getSnapshot().pressed).toBe(false);
  }
  event(f.global, 'mousedown', { button: 0 }); expect(f.fire.getSnapshot().pressed).toBe(false);
  f.doc.pointerLockElement = new EventTarget(); f.down(); expect(f.fire.getSnapshot().pressed).toBe(false);
  f.doc.pointerLockElement = f.canvas; f.doc.hidden = true; f.down();
  expect(f.fire.getSnapshot().pressed).toBe(false); f.cleanup();
});

test('missing button releases hold while retaining the short-click edge; polling cannot revive hold', () => {
  const f = setup(); f.lock(); f.down();
  event(f.global, 'mousemove', { buttons: 0 });
  expect(f.fire.consume()).toEqual({ held: false, pressed: true });
  event(f.global, 'mousemove', { buttons: 1 });
  expect(f.fire.consume()).toEqual({ held: false, pressed: false }); f.cleanup();
});

test('rebind, stale cleanup and unsubscribe release state and leave no old listeners', () => {
  const f = setup(); f.lock(); f.down();
  const detach = f.fire.attach(f.canvas, f.global, f.doc); f.detach(); f.down();
  expect(f.fire.getSnapshot().held).toBe(true);
  f.unsubscribe(); f.changed.mockClear(); detach(); detach(); f.down();
  expect(f.fire.getSnapshot()).toEqual({ held: false, pressed: false });
  expect(f.changed).not.toHaveBeenCalled(); f.cleanup();
});
