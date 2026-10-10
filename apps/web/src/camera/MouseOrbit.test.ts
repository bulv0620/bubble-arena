import { expect, test } from 'vitest';
import { CAMERA_CONFIG } from '@bubble-arena/shared';
import { MouseOrbit } from './MouseOrbit';
import { PointerLockInput } from './PointerLockInput';
import { PerspectiveCamera, Vector3 } from 'three';
import { updateFollowCamera } from './cameraFollowPose';

const mouse = (target: EventTarget, type: string, values: Record<string, number | boolean | string>) => {
  target.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), values));
};

test('fallback drag is disabled when pointer lock owns rotation', () => {
  const canvas = new EventTarget(), global = new EventTarget(), visibility = new EventTarget();
  const orbit = new MouseOrbit(); let enabled = false;
  const detach = orbit.attach(canvas, global, visibility, () => enabled);
  mouse(canvas, 'mousedown', { button: 0, clientX: 0, clientY: 0 });
  mouse(global, 'mousemove', { buttons: 1, clientX: 100, clientY: 0 });
  expect(orbit.step().yaw).toBe(0);
  enabled = true;
  mouse(canvas, 'mousedown', { button: 0, clientX: 0, clientY: 0 });
  mouse(global, 'mousemove', { buttons: 1, clientX: 100, clientY: 0 });
  expect(orbit.step().yaw).toBeCloseTo(-0.3);
  enabled = false;
  mouse(global, 'mousemove', { buttons: 1, clientX: 500, clientY: 0 });
  expect(orbit.step().yaw).toBeCloseTo(-0.3); detach();
});

test('the first sampled frame receives the full mouse delta and stopping has no catch-up', () => {
  const orbit = new MouseOrbit(); orbit.rotate(100, 80);
  const first = orbit.step();
  expect(first.yaw).toBeCloseTo(-100 * CAMERA_CONFIG.mouseSensitivity, 12);
  expect(first.pitch).toBeCloseTo(CAMERA_CONFIG.initialPitch + 80 * CAMERA_CONFIG.mouseSensitivity, 12);
  for (let frame = 0; frame < 120; frame++) expect(orbit.step()).toEqual(first);
});

test('rapid reverse input and differently batched events have no residual turn', () => {
  const batched = new MouseOrbit(), sampled = new MouseOrbit();
  for (const [dx, dy] of [[100, 40], [-140, -60], [40, 20]]) {
    batched.rotate(dx, dy); sampled.rotate(dx, dy); sampled.step();
  }
  expect(batched.step()).toEqual(sampled.step());
  expect(batched.step().yaw).toBeCloseTo(0, 12);
  expect(batched.step().pitch).toBeCloseTo(CAMERA_CONFIG.initialPitch, 12);
  const saved = batched.step(); saved.yaw = 99; saved.pitch = 99;
  expect(batched.step()).toEqual(sampled.step());
});

test('pitch limits and yaw wrapping prevent flips; invalid mouse input retains angles', () => {
  const orbit = new MouseOrbit();
  orbit.rotate(100000, 100000);
  const top = orbit.step();
  expect(Math.abs(top.yaw)).toBeLessThanOrEqual(Math.PI);
  expect(top.pitch).toBeCloseTo(CAMERA_CONFIG.maxPitch);
  orbit.rotate(NaN, 0); orbit.rotate(0, Infinity);
  expect(orbit.step()).toEqual(top);
  orbit.rotate(0, -100000);
  expect(orbit.step().pitch).toBeCloseTo(CAMERA_CONFIG.minPitch);
  const crossing = new MouseOrbit();
  crossing.rotate(-3.1 / CAMERA_CONFIG.mouseSensitivity, 0); crossing.step();
  crossing.rotate(-0.1 / CAMERA_CONFIG.mouseSensitivity, 0);
  const next = crossing.step().yaw;
  expect(Math.atan2(Math.sin(next - 3.1), Math.cos(next - 3.1))).toBeGreaterThan(0);
});

test('continuous overshoot stays within -60 to 70 degrees at every sampled frame', () => {
  expect(CAMERA_CONFIG.minPitch * 180 / Math.PI).toBeCloseTo(-60);
  expect(CAMERA_CONFIG.maxPitch * 180 / Math.PI).toBeCloseTo(70);
  const orbit = new MouseOrbit();
  for (const dy of [10000, -10000, 10000]) {
    for (let i = 0; i < 120; i++) {
      orbit.rotate(30, dy);
      const { yaw, pitch } = orbit.step();
      expect(pitch).toBeGreaterThanOrEqual(CAMERA_CONFIG.minPitch);
      expect(pitch).toBeLessThanOrEqual(CAMERA_CONFIG.maxPitch);
      expect(Number.isFinite(yaw)).toBe(true);
    }
    expect(orbit.step().pitch).toBeCloseTo(dy > 0 ? CAMERA_CONFIG.maxPitch : CAMERA_CONFIG.minPitch);
  }
});

test('overshoot is discarded, so a small reverse drag immediately leaves either limit', () => {
  for (const direction of [1, -1]) {
    const orbit = new MouseOrbit();
    for (let i = 0; i < 100; i++) orbit.rotate(0, direction * 10000);
    const boundary = orbit.step();
    orbit.rotate(100, -direction * 10);
    const next = orbit.step();
    expect((next.pitch - boundary.pitch) * direction).toBeLessThan(0);
    expect(next.yaw).toBeLessThan(boundary.yaw);
    expect(orbit.step().pitch).toBeCloseTo(boundary.pitch - direction * 10 * CAMERA_CONFIG.mouseSensitivity);
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
  expect(orbit.step().yaw).toBe(0);
  for (const release of ['mouseup', 'blur', 'visibilitychange', 'lostButtons']) {
    mouse(canvas, 'mousedown', { button: 0, clientX: 10, clientY: 10 });
    mouse(global, 'mousemove', { clientX: 30, clientY: 20, buttons: 1 });
    const before = orbit.step();
    if (release === 'visibilitychange') {
      visibility.hidden = true; visibility.dispatchEvent(new Event(release)); visibility.hidden = false;
    } else if (release === 'lostButtons') mouse(global, 'mousemove', { buttons: 0 });
    else global.dispatchEvent(new Event(release));
    mouse(global, 'mousemove', { clientX: 1000, clientY: 1000, buttons: 1 });
    expect(orbit.step()).toEqual(before);
  }
  detach(); detach();
  mouse(canvas, 'mousedown', { button: 0, clientX: 0, clientY: 0 });
  mouse(global, 'mousemove', { clientX: 500, clientY: 500, buttons: 1 });
  const saved = orbit.step();
  expect(orbit.step()).toEqual(saved);
});

test('reattachment removes old listeners; stale cleanup cannot detach the new binding', () => {
  const old = new EventTarget(), canvas = new EventTarget(), global = new EventTarget();
  const visibility = new EventTarget(), orbit = new MouseOrbit();
  const stale = orbit.attach(old, global, visibility);
  const detach = orbit.attach(canvas, global, visibility);
  stale();
  mouse(old, 'mousedown', { button: 0, clientX: 0, clientY: 0 });
  mouse(global, 'mousemove', { buttons: 1, clientX: 100, clientY: 0 });
  expect(orbit.step().yaw).toBe(0);
  mouse(canvas, 'mousedown', { button: 0, clientX: 0, clientY: 0 });
  mouse(global, 'mousemove', { buttons: 1, clientX: 100, clientY: 0 });
  expect(orbit.step().yaw).toBeCloseTo(-0.3);
  detach();
});

test('confirmed pointer lock delta is fully reflected in the next Three camera pose, including live sensitivity', () => {
  const canvas = Object.assign(new EventTarget(), { requestPointerLock: () => {} });
  const global = new EventTarget(), doc = Object.assign(new EventTarget(), { pointerLockElement: null as EventTarget | null });
  const control = new PointerLockInput(), orbit = new MouseOrbit(); let speed = 1;
  const detach = control.attach(canvas, global, doc, (dx, dy) => orbit.rotate(dx, dy, speed), () => {});
  const camera = new PerspectiveCamera(70, 16 / 9, .1, 200), target = { translation: () => ({ x: 0, y: .91, z: 0 }) };
  const pose = () => { updateFollowCamera(camera, target, orbit.step()); return camera.getWorldDirection(new Vector3()); };
  try {
    control.request(); doc.pointerLockElement = canvas; doc.dispatchEvent(new Event('pointerlockchange'));
    mouse(global, 'mousemove', { movementX: 100, movementY: 20 });
    const first = pose(), pitch = CAMERA_CONFIG.initialPitch + .06;
    expect(first.x).toBeCloseTo(Math.sin(.3) * Math.cos(pitch), 12);
    expect(first.y).toBeCloseTo(-Math.sin(pitch), 12);
    expect(first.z).toBeCloseTo(-Math.cos(.3) * Math.cos(pitch), 12);
    speed = 2;
    mouse(global, 'mousemove', { movementX: -50, movementY: -10 });
    const reversed = pose();
    expect(reversed.x).toBeCloseTo(0, 12);
    expect(reversed.y).toBeCloseTo(-Math.sin(CAMERA_CONFIG.initialPitch), 12);
    mouse(global, 'keydown', { code: 'Escape' });
    mouse(global, 'mousemove', { movementX: 1000, movementY: 1000 });
    expect(pose()).toEqual(reversed);
  } finally { detach(); }
});
