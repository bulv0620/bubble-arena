import { expect, test, vi } from 'vitest';
import { LocalRifle } from './LocalRifle';
import { FireInput } from './FireInput';
import { PointerLockInput } from '../camera';
import { AimInput } from '../input';

function event(target: EventTarget, type: string, values = {}) {
  target.dispatchEvent(Object.assign(new Event(type), values));
}
test('adapter notifies only accepted shots and unsubscribe prevents further HUD updates', () => {
  const rifle = new LocalRifle(), changed = vi.fn(), unsubscribe = rifle.subscribe(changed);
  const before = rifle.getSnapshot();
  rifle.step({ held: false, pressed: false }); expect(rifle.getSnapshot()).toBe(before);
  for (let i = 0; i < 60; i++) rifle.step({ held: true, pressed: false });
  expect(changed).toHaveBeenCalledTimes(8);
  unsubscribe(); changed.mockClear(); rifle.step({ held: true, pressed: false });
  expect(changed).not.toHaveBeenCalled();
});

test('real input collector plus adapter: activation/drag cannot deduct, hold consumes once per rule tick, Escape stops', () => {
  const pointer = new PointerLockInput(), aim = new AimInput(), input = new FireInput(pointer, aim), rifle = new LocalRifle();
  const canvas = Object.assign(new EventTarget(), { requestPointerLock: () => {} }), global = new EventTarget();
  const doc = Object.assign(new EventTarget(), { hidden: false, pointerLockElement: null as EventTarget | null,
    exitPointerLock: () => { doc.pointerLockElement = null; event(doc, 'pointerlockchange'); } });
  const unAim = aim.attach(canvas, global, doc);
  const unPointer = pointer.attach(canvas, global, doc, () => {}, () => { aim.clear(); input.clear(); }, () => !aim.getSnapshot());
  const detach = input.attach(canvas, global, doc);
  const step = () => rifle.step(input.consume());
  event(canvas, 'mousedown', { button: 0 }); step();
  event(canvas, 'click', { button: 0 }); event(doc, 'pointerlockerror');
  event(canvas, 'mousedown', { button: 0 }); step();
  expect(rifle.getSnapshot().magazine).toBe(30);
  event(canvas, 'mousedown', { button: 2 }); event(canvas, 'mousedown', { button: 0 });
  let accepted = 0; for (let i = 0; i < 60; i++) if (step()) accepted++;
  expect(accepted).toBe(8); expect(rifle.getSnapshot()).toMatchObject({ magazine: 22, reserve: 120 });
  event(global, 'keydown', { code: 'Escape' });
  for (let i = 0; i < 60; i++) expect(step()).toBeNull();
  expect(rifle.getSnapshot().magazine).toBe(22);
  detach(); unPointer(); unAim();
});

test('a short locked click between physics steps deducts once, then remains idle', () => {
  const pointer = new PointerLockInput(), aim = new AimInput(), input = new FireInput(pointer, aim), rifle = new LocalRifle();
  const canvas = Object.assign(new EventTarget(), { requestPointerLock: () => {} }), global = new EventTarget();
  const doc = Object.assign(new EventTarget(), { hidden: false, pointerLockElement: null as EventTarget | null });
  const unPointer = pointer.attach(canvas, global, doc, () => {}, input.clear);
  const detach = input.attach(canvas, global, doc);
  event(canvas, 'click', { button: 0 }); doc.pointerLockElement = canvas; event(doc, 'pointerlockchange');
  event(canvas, 'mousedown', { button: 0 }); event(global, 'mouseup', { button: 0 });
  expect(rifle.step(input.consume())).not.toBeNull();
  for (let i = 0; i < 60; i++) expect(rifle.step(input.consume())).toBeNull();
  expect(rifle.getSnapshot().magazine).toBe(29);
  detach(); unPointer();
});
