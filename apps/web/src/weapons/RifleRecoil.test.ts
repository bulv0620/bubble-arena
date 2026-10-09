import { expect, test } from 'vitest';
import { CAMERA_CONFIG } from '@bubble-arena/shared';
import { PerspectiveCamera } from 'three';
import { RifleRecoil, applyRecoilPitch } from './RifleRecoil';
import { updateFollowCamera } from '../camera/cameraFollowPose';
import { createScreenAimRay } from './screenAimRay';
test('one impulse per accepted identity, bounded continuous fire, decay and reset', () => {
  const recoil = new RifleRecoil();
  expect(recoil.kick(1)).toBe(true); expect(recoil.kick(1)).toBe(false);
  expect(recoil.step(0)).toBe(recoil.tuning.kickAngle + recoil.tuning.pulseAngle);
  for (let i = 2; i < 100; i++) recoil.kick(i);
  expect(recoil.step(0)).toBe(recoil.tuning.maxAngle + recoil.tuning.maxPulseAngle);
  const before = recoil.step(0); expect(recoil.step(NaN)).toBe(before); expect(recoil.step(-1)).toBe(before);
  expect(recoil.step(0.1)).toBeLessThan(before); expect(recoil.getState().riseAngle).toBe(recoil.tuning.maxAngle); expect(recoil.step(0.1)).toBeLessThan(before); expect(recoil.step(10)).toBe(0);
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
  for (const bad of [{ kickAngle: -1 }, { maxAngle: 0 }, { recoveryResponse: 0 }, { kickAngle: NaN }, { maxAngle: Infinity }, { recoveryDelay: -1 }, { recoveryDelay: NaN }, { pulseAngle: -1 }, { maxPulseAngle: 0 }, { pulseRecoveryResponse: 0 }]) expect(() => new RifleRecoil(bad)).toThrow(RangeError);
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

test('real 8/s burst now builds to visible six-degree kick and recovers after firing stops', () => {
  const recoil = new RifleRecoil(); let sequence = 0, peak = 0;
  for (let i = 0; i < 60; i++) {
    if ([0, 8, 15, 23, 30, 38, 45, 53].includes(i)) recoil.kick(++sequence);
    peak = Math.max(peak, recoil.step(1 / 60));
  }
  expect(recoil.getState().riseAngle).toBeCloseTo(6 * Math.PI / 180);
  expect(peak).toBeGreaterThan(6 * Math.PI / 180);
  expect(peak).toBeLessThanOrEqual(recoil.tuning.maxAngle + recoil.tuning.maxPulseAngle);
  expect(recoil.step(0)).toBeGreaterThan(5 * Math.PI / 180);
  recoil.step(2); expect(recoil.step(0)).toBe(0);
});

test('each fresh shot still produces a recoverable pulse after cumulative rise saturates', () => {
  const recoil = new RifleRecoil();
  for (let i = 1; i <= 5; i++) { recoil.kick(i); recoil.step(.125); }
  const saturated = recoil.getState().riseAngle;
  expect(saturated).toBeCloseTo(recoil.tuning.maxAngle);
  for (let sequence = 6; sequence <= 20; sequence++) {
    const before = recoil.step(0);
    expect(recoil.kick(sequence)).toBe(true);
    const peak = recoil.step(0);
    expect(peak).toBeGreaterThan(before + .5 * Math.PI / 180);
    expect(recoil.getState().riseAngle).toBe(saturated);
    expect(recoil.kick(sequence)).toBe(false); expect(recoil.step(0)).toBe(peak);
    const trough = recoil.step(.125);
    expect(trough).toBeLessThan(peak);
    expect(recoil.getState().riseAngle).toBe(saturated);
  }
  recoil.reset(); expect(recoil.getState()).toEqual({ riseAngle: 0, pulseAngle: 0 });
  expect(recoil.step(0)).toBe(0);
});
test('pulse is time-based across frame rates and full camera ray still restores after stopping', () => {
  const a = new RifleRecoil(), b = new RifleRecoil(); a.kick(1); b.kick(1);
  for (let i = 0; i < 3; i++) a.step(1 / 30);
  for (let i = 0; i < 6; i++) b.step(1 / 60);
  expect(a.getState().pulseAngle).toBeCloseTo(b.getState().pulseAngle, 12);
  const camera = new PerspectiveCamera(), target = { translation: () => ({ x: 0, y: 1, z: 0 }) };
  const base = { yaw: 0, pitch: CAMERA_CONFIG.initialPitch };
  updateFollowCamera(camera, target, base); const initial = createScreenAimRay(camera)!.direction;
  updateFollowCamera(camera, target, applyRecoilPitch(base, a.step(0))); expect(createScreenAimRay(camera)!.direction.y).toBeGreaterThan(initial.y);
  updateFollowCamera(camera, target, applyRecoilPitch(base, a.step(3))); expect(createScreenAimRay(camera)!.direction).toEqual(initial);
});
test('long idle frames cannot overflow the hold timer or revive stale pulse offsets', () => {
  const recoil = new RifleRecoil(); recoil.kick(1);
  expect(recoil.step(Number.MAX_VALUE)).toBe(0);
  expect(recoil.step(Number.MAX_VALUE)).toBe(0);
  expect(recoil.kick(2)).toBe(true); expect(Number.isFinite(recoil.step(1 / 60))).toBe(true);
});
