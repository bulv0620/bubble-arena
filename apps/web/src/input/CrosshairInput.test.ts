import { expect, test, vi } from 'vitest';
import { PointerLockInput } from '../camera';
import { AimInput } from './AimInput';
import { CrosshairInput } from './CrosshairInput';

function event(target: EventTarget, type: string, values = {}) {
  target.dispatchEvent(Object.assign(new Event(type), values));
}
function setup(supported = true, aimChangesMode = true) {
  const canvas = Object.assign(new EventTarget(), supported ? { requestPointerLock: () => {} } : {});
  const global = new EventTarget(), aim = new AimInput(), pointer = new PointerLockInput();
  const doc = Object.assign(new EventTarget(), { hidden: false, pointerLockElement: null as EventTarget | null,
    exitPointerLock: () => { doc.pointerLockElement = null; event(doc, 'pointerlockchange'); } });
  const unAim = aim.attach(canvas, global, doc);
  const unPointer = pointer.attach(canvas, global, doc, () => {}, () => aim.clear());
  const input = new CrosshairInput(pointer, aim, aimChangesMode), changed = vi.fn(), unsubscribe = input.subscribe(changed);
  const detach = input.attach(canvas, global, doc);
  const click = () => { event(canvas, 'mousedown', { button: 0 }); event(canvas, 'click', { button: 0 }); };
  const grant = () => { doc.pointerLockElement = canvas; event(doc, 'pointerlockchange'); };
  const cleanup = () => { detach(); unPointer(); unAim(); unsubscribe(); };
  return { canvas, global, doc, aim, pointer, input, changed, unsubscribe, detach, click, grant, cleanup };
}

test('idle/requesting hidden, owned lock normal, aim compact, right release ordinary, external loss hidden', () => {
  const f = setup(); expect(f.input.getSnapshot()).toBe('hidden');
  f.click(); expect(f.input.getSnapshot()).toBe('hidden');
  f.grant(); expect(f.input.getSnapshot()).toBe('normal');
  event(f.canvas, 'mousedown', { button: 2 }); expect(f.input.getSnapshot()).toBe('aiming');
  event(f.global, 'mouseup', { button: 2 }); expect(f.input.getSnapshot()).toBe('normal');
  f.doc.pointerLockElement = null; event(f.doc, 'pointerlockchange');
  expect(f.input.getSnapshot()).toBe('hidden'); f.cleanup();
});

test('denied lock enables explicit fallback, Escape hides and fresh click reactivates only after settlement', () => {
  const f = setup(); f.click(); event(f.doc, 'pointerlockerror');
  expect(f.input.getSnapshot()).toBe('normal');
  event(f.global, 'keydown', { code: 'Escape' }); expect(f.input.getSnapshot()).toBe('hidden');
  event(f.global, 'focus'); expect(f.input.getSnapshot()).toBe('hidden');
  f.click(); expect(f.input.getSnapshot()).toBe('hidden');
  event(f.doc, 'pointerlockerror'); expect(f.input.getSnapshot()).toBe('normal'); f.cleanup();
});

test.each(['blur', 'hidden', 'escape'])('unsupported fallback %s cancels and never auto-reactivates', reason => {
  const f = setup(false); expect(f.input.getSnapshot()).toBe('hidden');
  f.click(); expect(f.input.getSnapshot()).toBe('normal');
  if (reason === 'blur') event(f.global, 'blur');
  if (reason === 'hidden') { f.doc.hidden = true; event(f.doc, 'visibilitychange'); }
  if (reason === 'escape') event(f.global, 'keydown', { code: 'Escape' });
  expect(f.input.getSnapshot()).toBe('hidden');
  f.doc.hidden = false; event(f.global, 'focus'); event(f.doc, 'visibilitychange');
  expect(f.input.getSnapshot()).toBe('hidden');
  f.click(); expect(f.input.getSnapshot()).toBe('normal'); f.cleanup();
});

test('unlocked right press shows aim only while held; neither modifiers nor another canvas lock activates', () => {
  const f = setup();
  event(f.canvas, 'mousedown', { button: 2, ctrlKey: true }); expect(f.input.getSnapshot()).toBe('hidden');
  f.doc.pointerLockElement = new EventTarget(); f.click();
  expect(f.input.getSnapshot()).toBe('hidden');
  f.doc.pointerLockElement = null;
  event(f.canvas, 'mousedown', { button: 2 }); expect(f.input.getSnapshot()).toBe('aiming');
  event(f.global, 'mouseup', { button: 2 });
  // Pointer status is error from the explicitly rejected other-element lock, so
  // fresh own-canvas interaction may use ordinary fallback after releasing aim.
  expect(f.input.getSnapshot()).toBe('normal'); f.cleanup();
});

test('idle unlocked aim release hides; hidden page refuses entry', () => {
  const f = setup();
  event(f.canvas, 'mousedown', { button: 2 }); expect(f.input.getSnapshot()).toBe('aiming');
  event(f.global, 'mouseup', { button: 2 }); expect(f.input.getSnapshot()).toBe('hidden');
  f.doc.hidden = true; event(f.canvas, 'mousedown', { button: 2 });
  expect(f.input.getSnapshot()).toBe('hidden'); f.cleanup();
});

test('unsubscribe, rebind, stale cleanup and detached events do not leak HUD state', () => {
  const f = setup(false); f.click();
  const detach = f.input.attach(f.canvas, f.global, f.doc); f.detach();
  f.click(); expect(f.input.getSnapshot()).toBe('normal');
  f.unsubscribe(); f.changed.mockClear(); detach(); detach();
  f.click(); event(f.canvas, 'mousedown', { button: 2 });
  expect(f.input.getSnapshot()).toBe('hidden'); expect(f.changed).not.toHaveBeenCalled(); f.cleanup();
});

test('ordinary rifle right click never enters a compact aim mode, while explicit fallback remains usable', () => {
  const f = setup(true, false);
  event(f.canvas, 'mousedown', { button: 2 }); expect(f.input.getSnapshot()).toBe('hidden');
  event(f.global, 'mouseup', { button: 2 }); f.click(); f.grant();
  event(f.canvas, 'mousedown', { button: 2 }); expect(f.input.getSnapshot()).toBe('normal');
  event(f.global, 'mouseup', { button: 2 }); expect(f.input.getSnapshot()).toBe('normal');
  event(f.global, 'keydown', { code: 'Escape' }); f.cleanup();
  const fallback = setup(false, false); fallback.click();
  event(fallback.canvas, 'mousedown', { button: 2 }); expect(fallback.input.getSnapshot()).toBe('normal');
  fallback.cleanup();
});
