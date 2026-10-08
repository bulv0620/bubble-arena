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

test('pitch limits and yaw wrapping prevent flips; invalid input and dt retain angles', () => {
  const orbit = new MouseOrbit();
  orbit.rotate(100000, 100000);
  const top = orbit.step(10);
  expect(Math.abs(top.yaw)).toBeLessThanOrEqual(Math.PI);
  expect(top.pitch).toBeCloseTo(CAMERA_CONFIG.maxPitch);
  orbit.rotate(NaN, 0); orbit.rotate(0, Infinity);
  expect(orbit.step(NaN)).toEqual(top);
  expect(orbit.step(-1)).toEqual(top);
  orbit.rotate(0, -100000);
  expect(orbit.step(10).pitch).toBeCloseTo(CAMERA_CONFIG.minPitch);
  const crossing = new MouseOrbit();
  crossing.rotate(-3.1 / CAMERA_CONFIG.mouseSensitivity, 0); crossing.step(10);
  crossing.rotate(-0.1 / CAMERA_CONFIG.mouseSensitivity, 0);
  const next = crossing.step(1 / 60).yaw;
  expect(Math.atan2(Math.sin(next - 3.1), Math.cos(next - 3.1))).toBeGreaterThan(0);
});

test('continuous overshoot stays within -60 to 70 degrees at every smoothed frame', () => {
  expect(CAMERA_CONFIG.minPitch * 180 / Math.PI).toBeCloseTo(-60);
  expect(CAMERA_CONFIG.maxPitch * 180 / Math.PI).toBeCloseTo(70);
  const orbit = new MouseOrbit();
  for (const dy of [10000, -10000, 10000]) {
    for (let i = 0; i < 120; i++) {
      orbit.rotate(30, dy);
      const { yaw, pitch } = orbit.step(i % 2 ? 1 / 30 : 1 / 60);
      expect(pitch).toBeGreaterThanOrEqual(CAMERA_CONFIG.minPitch);
      expect(pitch).toBeLessThanOrEqual(CAMERA_CONFIG.maxPitch);
      expect(Number.isFinite(yaw)).toBe(true);
    }
    expect(orbit.step(10).pitch).toBeCloseTo(dy > 0 ? CAMERA_CONFIG.maxPitch : CAMERA_CONFIG.minPitch);
  }
});

test('overshoot is discarded, so a small reverse drag immediately leaves either limit', () => {
  for (const direction of [1, -1]) {
    const orbit = new MouseOrbit();
    for (let i = 0; i < 100; i++) orbit.rotate(0, direction * 10000);
    const boundary = orbit.step(10);
    orbit.rotate(100, -direction * 10);
    const next = orbit.step(1 / 60);
    expect((next.pitch - boundary.pitch) * direction).toBeLessThan(0);
    expect(next.yaw).toBeLessThan(boundary.yaw);
    expect(orbit.step(10).pitch).toBeCloseTo(boundary.pitch - direction * 10 * CAMERA_CONFIG.mouseSensitivity);
  }
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
