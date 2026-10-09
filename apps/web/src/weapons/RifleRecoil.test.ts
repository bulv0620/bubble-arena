import { expect, test } from 'vitest';
import { CAMERA_CONFIG } from '@bubble-arena/shared';
import { PerspectiveCamera } from 'three';
import { RifleRecoil, applyRecoilPitch } from './RifleRecoil';
import { updateFollowCamera } from '../camera/cameraFollowPose';
import { createScreenAimRay } from './screenAimRay';
test('one impulse per accepted identity, bounded continuous fire, decay and reset', () => {
  const recoil = new RifleRecoil();
  expect(recoil.kick(1)).toBe(true); expect(recoil.kick(1)).toBe(false);
  expect(recoil.step(0)).toBe(recoil.tuning.kickAngle);
  for (let i = 2; i < 100; i++) recoil.kick(i);
  expect(recoil.step(0)).toBe(recoil.tuning.maxAngle);
  const before = recoil.step(0); expect(recoil.step(NaN)).toBe(before); expect(recoil.step(-1)).toBe(before);
  expect(recoil.step(0.1)).toBeLessThan(before); expect(recoil.step(10)).toBe(0);
  recoil.kick(100); recoil.reset(); expect(recoil.step(0)).toBe(0); expect(recoil.kick(100)).toBe(false);
  expect(() => recoil.kick(0)).toThrow(TypeError);
});
test('decay is time-based across 30/60Hz and tuning validates without sharing mutable configuration', () => {
  const a = new RifleRecoil(), b = new RifleRecoil(); a.kick(1); b.kick(1);
  for (let i = 0; i < 15; i++) a.step(1 / 30);
  for (let i = 0; i < 30; i++) b.step(1 / 60);
  expect(a.step(0)).toBeCloseTo(b.step(0), 12);
  const overrides = { kickAngle: 0.01 }; const custom = new RifleRecoil(overrides); overrides.kickAngle = 0.02;
  expect(custom.tuning.kickAngle).toBe(0.01); expect(Object.isFrozen(custom.tuning)).toBe(true);
  for (const bad of [{ kickAngle: -1 }, { maxAngle: 0 }, { recoveryResponse: 0 }, { kickAngle: NaN }, { maxAngle: Infinity }]) expect(() => new RifleRecoil(bad)).toThrow(RangeError);
  const disabled = new RifleRecoil({ kickAngle: 0, maxAngle: 0 }); disabled.kick(1); expect(disabled.step(0)).toBe(0);
});
test('camera upkick enters next center ray, preserves mouse yaw/base pitch, restores exact direction and clamps', () => {
  const camera = new PerspectiveCamera(), target = { translation: () => ({ x: 0, y: 1, z: 0 }) };
  const base = { yaw: 0.5, pitch: CAMERA_CONFIG.initialPitch }, recoil = new RifleRecoil();
  updateFollowCamera(camera, target, base); const initial = createScreenAimRay(camera)!;
  recoil.kick(1); const kicked = applyRecoilPitch(base, recoil.step(0));
  updateFollowCamera(camera, target, kicked); const after = createScreenAimRay(camera)!;
  expect(after.direction.y).toBeGreaterThan(initial.direction.y); expect(kicked.yaw).toBe(base.yaw);
  expect(base.pitch).toBe(CAMERA_CONFIG.initialPitch);
  updateFollowCamera(camera, target, applyRecoilPitch(base, recoil.step(10)));
  expect(createScreenAimRay(camera)!.direction).toEqual(initial.direction);
  expect(applyRecoilPitch({ yaw: 1, pitch: CAMERA_CONFIG.minPitch }, 1).pitch).toBe(CAMERA_CONFIG.minPitch);
});
