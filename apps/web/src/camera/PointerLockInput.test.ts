import { expect, test, vi } from 'vitest';
import { PointerLockInput } from './PointerLockInput';

function event(target: EventTarget, type: string, values = {}) {
  target.dispatchEvent(Object.assign(new Event(type), values));
}
function setup(request: () => void | Promise<void> = () => {}) {
  const canvas = Object.assign(new EventTarget(), { requestPointerLock: vi.fn(request) });
  const doc = Object.assign(new EventTarget(), { hidden: false, pointerLockElement: null as EventTarget | null,
    exitPointerLock: vi.fn(() => { doc.pointerLockElement = null; event(doc, 'pointerlockchange'); }) });
  const global = new EventTarget(), rotate = vi.fn(), clear = vi.fn(), control = new PointerLockInput();
  const detach = control.attach(canvas, global, doc, rotate, clear);
  const click = () => event(canvas, 'click', { button: 0 });
  const grant = () => { doc.pointerLockElement = canvas; event(doc, 'pointerlockchange'); };
  return { canvas, doc, global, rotate, clear, control, detach, click, grant };
}

test('only confirmed own lock accepts relative movement; Escape releases and clears input', () => {
  const f = setup();
  event(f.global, 'mousemove', { movementX: 20, movementY: 30 });
  expect(f.rotate).not.toHaveBeenCalled();
  f.click(); f.click();
  expect(f.canvas.requestPointerLock).toHaveBeenCalledTimes(1);
  expect(f.control.getSnapshot()).toBe('requesting');
  f.grant();
  event(f.global, 'mousemove', { movementX: 20, movementY: 30, buttons: 0 });
  expect(f.rotate).toHaveBeenCalledWith(20, 30);
  event(f.global, 'keydown', { code: 'Escape' });
  expect(f.doc.pointerLockElement).toBeNull();
  expect(f.control.getSnapshot()).toBe('idle');
  expect(f.clear).toHaveBeenCalled();
  f.detach();
});

test('blur, hidden page and external loss stop rotation and clear held intents', () => {
  for (const reason of ['blur', 'hidden', 'external']) {
    const f = setup(); f.click(); f.grant();
    if (reason === 'blur') event(f.global, 'blur');
    else if (reason === 'hidden') { f.doc.hidden = true; event(f.doc, 'visibilitychange'); }
    else { f.doc.pointerLockElement = null; event(f.doc, 'pointerlockchange'); }
    event(f.global, 'mousemove', { movementX: 20, movementY: 30 });
    expect(f.rotate).not.toHaveBeenCalled();
    expect(f.control.getSnapshot()).toBe('idle');
    expect(f.clear).toHaveBeenCalled(); f.detach();
  }
});

test('throw, error event and promise rejection show failure and permit a fresh click', async () => {
  for (const request of [() => { throw new Error('denied'); }, () => Promise.reject(new Error('denied')), () => {}]) {
    const f = setup(request); f.click();
    event(f.doc, 'pointerlockerror'); await Promise.resolve();
    expect(f.control.getSnapshot()).toBe('error');
    f.click(); expect(f.canvas.requestPointerLock).toHaveBeenCalledTimes(2);
    event(f.doc, 'pointerlockerror'); await Promise.resolve(); f.detach();
  }
});

test('cancelled or detached pending legacy request releases a late grant', () => {
  for (const detach of [false, true]) {
    const f = setup(); f.click();
    if (detach) f.detach(); else event(f.global, 'keydown', { code: 'Escape' });
    f.grant();
    expect(f.doc.pointerLockElement).toBeNull();
    expect(f.control.getSnapshot()).toBe('idle'); f.detach();
    event(f.global, 'mousemove', { movementX: 30, movementY: 0 });
    expect(f.rotate).not.toHaveBeenCalled();
  }
});

test('unsupported browser, modifier clicks and another element lock are handled without stealing', () => {
  const f = setup();
  event(f.canvas, 'click', { button: 2 }); event(f.canvas, 'click', { button: 0, ctrlKey: true });
  expect(f.canvas.requestPointerLock).not.toHaveBeenCalled();
  const other = new EventTarget(); f.doc.pointerLockElement = other; f.click();
  expect(f.control.getSnapshot()).toBe('error'); f.detach();
  expect(f.doc.pointerLockElement).toBe(other);
  f.control.attach(new EventTarget(), f.global, f.doc, f.rotate, f.clear)();
  expect(f.control.getSnapshot()).toBe('unsupported');
});

test('rebind and stale cleanup do not remove the new listeners; subscriptions unsubscribe', () => {
  const f = setup(), changed = vi.fn(); const unsubscribe = f.control.subscribe(changed);
  const detach = f.control.attach(f.canvas, f.global, f.doc, f.rotate, f.clear);
  f.detach(); f.click(); f.grant();
  expect(f.control.getSnapshot()).toBe('locked'); expect(changed).toHaveBeenCalled();
  unsubscribe(); changed.mockClear(); detach(); detach();
  expect(changed).not.toHaveBeenCalled();
  event(f.global, 'mousemove', { movementX: 20, movementY: 20 });
  expect(f.rotate).not.toHaveBeenCalled();
});

test('a late old-canvas grant is released after switching to a different unsupported canvas', () => {
  const f = setup(); f.click();
  const detach = f.control.attach(new EventTarget(), f.global, f.doc, f.rotate, f.clear);
  f.grant();
  expect(f.doc.pointerLockElement).toBeNull();
  expect(f.control.getSnapshot()).toBe('unsupported');
  detach();
});

test('menu blocks canvas activation; return button requests synchronously; release cancels late grants', () => {
  const f = setup(); let menu = true;
  const detach = f.control.attach(f.canvas, f.global, f.doc, f.rotate, f.clear, () => !menu);
  f.click(); f.control.request();
  expect(f.canvas.requestPointerLock).not.toHaveBeenCalled();
  menu = false; f.control.request();
  expect(f.canvas.requestPointerLock).toHaveBeenCalledTimes(1);
  menu = true; f.control.release(); f.grant();
  expect(f.doc.pointerLockElement).toBeNull();
  menu = false; f.control.request(); f.grant();
  expect(f.control.getSnapshot()).toBe('locked');
  f.control.release(); expect(f.doc.pointerLockElement).toBeNull();
  detach(); f.control.request();
  expect(f.canvas.requestPointerLock).toHaveBeenCalledTimes(2);
});
