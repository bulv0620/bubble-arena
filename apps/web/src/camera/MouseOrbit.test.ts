import { expect, test } from 'vitest';
import { CAMERA_CONFIG } from '@bubble-arena/shared';
import { MouseOrbit } from './MouseOrbit';

const mouse = (target: EventTarget, type: string, values: Record<string, number | boolean>) => {
  target.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), values));
};

test('rotation follows both axes smoothly, with frame-rate independent response', () => {
  const a = new MouseOrbit(), b = new MouseOrbit();
  a.rotate(100, 80); b.rotate(100, 80);
  const first = a.step(1 / 60);
  expect(first.yaw).toBeLessThan(0);
  expect(first.yaw).toBeGreaterThan(-0.3);
  expect(first.pitch).toBeGreaterThan(CAMERA_CONFIG.initialPitch);
  for (let i = 1; i < 60; i++) a.step(1 / 60);
  for (let i = 0; i < 30; i++) b.step(1 / 30);
  expect(a.step(0).yaw).toBeCloseTo(b.step(0).yaw, 10);
  expect(a.step(0).pitch).toBeCloseTo(b.step(0).pitch, 10);
});

test('pole guard and yaw wrapping prevent flips; invalid input and dt retain angles', () => {
  const orbit = new MouseOrbit();
  orbit.rotate(100000, 100000);
  const top = orbit.step(10);
  expect(Math.abs(top.yaw)).toBeLessThanOrEqual(Math.PI);
  expect(top.pitch).toBeCloseTo(CAMERA_CONFIG.poleGuard);
  orbit.rotate(NaN, 0); orbit.rotate(0, Infinity);
  expect(orbit.step(NaN)).toEqual(top);
  expect(orbit.step(-1)).toEqual(top);
  orbit.rotate(0, -100000);
  expect(orbit.step(10).pitch).toBeCloseTo(-CAMERA_CONFIG.poleGuard);
  const crossing = new MouseOrbit();
  crossing.rotate(-3.1 / CAMERA_CONFIG.mouseSensitivity, 0); crossing.step(10);
  crossing.rotate(-0.1 / CAMERA_CONFIG.mouseSensitivity, 0);
  const next = crossing.step(1 / 60).yaw;
  expect(Math.atan2(Math.sin(next - 3.1), Math.cos(next - 3.1))).toBeGreaterThan(0);
});

test('only canvas left drag rotates; release, blur and hidden tab clear held input', () => {
  const canvas = new EventTarget(), global = new EventTarget();
  const visibility = Object.assign(new EventTarget(), { hidden: false });
  const orbit = new MouseOrbit();
  const detach = orbit.attach(canvas, global, visibility);
  mouse(global, 'mousemove', { clientX: 100, clientY: 100, buttons: 1 });
  mouse(canvas, 'mousedown', { button: 2, clientX: 0, clientY: 0 });
  mouse(global, 'mousemove', { clientX: 100, clientY: 100, buttons: 2 });
  expect(orbit.step(10).yaw).toBe(0);
  for (const release of ['mouseup', 'blur', 'visibilitychange', 'lostButtons']) {
    mouse(canvas, 'mousedown', { button: 0, clientX: 10, clientY: 10 });
    mouse(global, 'mousemove', { clientX: 30, clientY: 20, buttons: 1 });
    const before = orbit.step(10);
    if (release === 'visibilitychange') {
      visibility.hidden = true; visibility.dispatchEvent(new Event(release)); visibility.hidden = false;
    } else if (release === 'lostButtons') mouse(global, 'mousemove', { buttons: 0 });
    else global.dispatchEvent(new Event(release));
    mouse(global, 'mousemove', { clientX: 1000, clientY: 1000, buttons: 1 });
    expect(orbit.step(10)).toEqual(before);
  }
  detach(); detach();
  mouse(canvas, 'mousedown', { button: 0, clientX: 0, clientY: 0 });
  mouse(global, 'mousemove', { clientX: 500, clientY: 500, buttons: 1 });
  const saved = orbit.step(0);
  expect(orbit.step(10)).toEqual(saved);
});

test('reattachment removes old listeners; stale cleanup cannot detach the new binding', () => {
  const old = new EventTarget(), canvas = new EventTarget(), global = new EventTarget();
  const visibility = new EventTarget(), orbit = new MouseOrbit();
  const stale = orbit.attach(old, global, visibility);
  const detach = orbit.attach(canvas, global, visibility);
  stale();
  mouse(old, 'mousedown', { button: 0, clientX: 0, clientY: 0 });
  mouse(global, 'mousemove', { buttons: 1, clientX: 100, clientY: 0 });
  expect(orbit.step(10).yaw).toBe(0);
  mouse(canvas, 'mousedown', { button: 0, clientX: 0, clientY: 0 });
  mouse(global, 'mousemove', { buttons: 1, clientX: 100, clientY: 0 });
  expect(orbit.step(10).yaw).toBeCloseTo(-0.3);
  detach();
});
