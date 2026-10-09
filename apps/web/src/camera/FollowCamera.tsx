import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { CAMERA_CONFIG, type CameraHeading } from '@bubble-arena/shared';
import { useRapier } from '@react-three/rapier';
import { cameraFocus, updateFollowCamera, type CameraFollowTarget } from './cameraFollowPose';
import { MouseOrbit } from './MouseOrbit';
import { avoidCameraObstacles } from './cameraAvoidance';
import { CameraDistanceRecovery } from './CameraDistanceRecovery';
import type { PointerLockInput } from './PointerLockInput';
import type { AimInput, CrosshairInput } from '../input';
import { RifleRecoil, applyRecoilPitch, createScreenAimRay, type TrainingTargets, type ScreenAimTarget, type FireInput } from '../weapons';

export function FollowCamera({ target, control, clearInput, view, aim, crosshair, fire, aimTarget, targets, recoil }: { target: RefObject<CameraFollowTarget | null>;
  control: PointerLockInput; clearInput: () => void; view: RefObject<CameraHeading>; aim: AimInput; crosshair: CrosshairInput; fire: FireInput; aimTarget: RefObject<ScreenAimTarget | null>; targets: TrainingTargets; recoil: RifleRecoil }) {
  const diagnostics = useRef(0);
  const previousRecoil = useRef(0);
  const [orbit] = useState(() => new MouseOrbit());
  const canvas = useThree(state => state.gl.domElement);
  const { world } = useRapier();
  const [previous] = useState(() => ({ position: new Vector3(), rotation: new Quaternion() }));
  const [recovery] = useState(() => new CameraDistanceRecovery());
  const recoveryTarget = useRef<CameraFollowTarget | null>(null);
  useEffect(() => () => { aimTarget.current = null; recoil.reset(); }, [aimTarget, recoil]);
  useEffect(() => aim.attach(canvas, window, document), [aim, canvas]);
  useEffect(() => control.attach(canvas, window, document,
    (dx, dy) => orbit.rotate(dx, dy), clearInput, () => !aim.getSnapshot()), [canvas, orbit, control, clearInput, aim]);
  useEffect(() => orbit.attach(canvas, window, document,
    () => (control.getSnapshot() === 'error' || control.getSnapshot() === 'unsupported') && !aim.getSnapshot()), [canvas, orbit, control, aim]);
  useEffect(() => crosshair.attach(canvas, window, document), [canvas, crosshair]);
  useEffect(() => fire.attach(canvas, window, document), [canvas, fire]);
  useFrame(({ camera }, dt) => {
    aimTarget.current = null;
    if (recoveryTarget.current !== target.current) {
      recovery.reset();
      recoil.reset();
      recoveryTarget.current = target.current;
    }
    const baseAngles = orbit.step(dt);
    const recoilOffset = recoil.step(dt);
    const angles = applyRecoilPitch(baseAngles, recoilOffset);
    view.current.yaw = angles.yaw;
    previous.position.copy(camera.position);
    previous.rotation.copy(camera.quaternion);
    const aiming = aim.getSnapshot();
    if (!(camera instanceof PerspectiveCamera) || !updateFollowCamera(camera, target.current, angles, aiming)) return;
    const position = target.current!.translation();
    const focus = cameraFocus(position, angles.yaw, aiming);
    const avoidance = avoidCameraObstacles(world, camera,
      { x: position.x, y: position.y + CAMERA_CONFIG.focusHeight, z: position.z }, focus, recovery, dt);
    if (avoidance.status !== 'resolved') {
      camera.position.copy(previous.position);
      camera.quaternion.copy(previous.rotation);
    }
    const ray = createScreenAimRay(camera);
    aimTarget.current = ray ? targets.aim(world, ray) : null;
    if (import.meta.env.DEV) {
      diagnostics.current += 1;
      if ((recoilOffset > 0 || previousRecoil.current > 0) && (diagnostics.current % 6 === 0 || recoilOffset === 0)) {
        console.info('[recoil.check]', JSON.stringify({ offset: recoilOffset, basePitch: baseAngles.pitch, pitch: angles.pitch }));
      }
      previousRecoil.current = recoilOffset;
      const recovering = avoidance.status === 'resolved'
        && avoidance.safeDistance - avoidance.distance > CAMERA_CONFIG.recoveryEpsilon;
      if (diagnostics.current === 1 || diagnostics.current % 120 === 0
        || (recovering && diagnostics.current % 6 === 0)) {
        if (diagnostics.current === 1 || diagnostics.current % 120 === 0) console.info('[aim.check]', JSON.stringify(aimTarget.current));
        console.info('[camera.check]', JSON.stringify({
          target: position, camera: camera.position,
          angles, aiming, shoulderOffset: aiming ? CAMERA_CONFIG.aimShoulderOffset : CAMERA_CONFIG.shoulderOffset,
          avoidance, probeRadius: CAMERA_CONFIG.obstacleRadius,
          distance: avoidance.status === 'resolved' ? avoidance.distance : null,
          fov: camera.fov,
        }));
      }
    }
  });
  return null;
}
