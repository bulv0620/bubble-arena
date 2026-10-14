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
import { SNIPER_SCOPE_CONFIG, WEAPON_CONFIGS } from '@bubble-arena/shared';
import type { LocalLoadout } from '../weapons/LocalLoadout';

import type { LocalRespawn } from '../player/LocalRespawn';

export function FollowCamera({ respawn, loadout, target, control, clearInput, view, aim, crosshair, fire, aimTarget, targets, recoil, enabled, sensitivity }: { respawn: LocalRespawn; loadout: LocalLoadout; enabled: () => boolean; sensitivity: () => number; target: RefObject<CameraFollowTarget | null>;
  control: PointerLockInput; clearInput: () => void; view: RefObject<CameraHeading>; aim: AimInput; crosshair: CrosshairInput; fire: FireInput; aimTarget: RefObject<ScreenAimTarget | null>; targets: TrainingTargets; recoil: RifleRecoil }) {
  const diagnostics = useRef(0);
  const previousRecoil = useRef(0);
  const lifeRevision = useRef(respawn.getRevision());
  const [orbit] = useState(() => new MouseOrbit());
  const canvas = useThree(state => state.gl.domElement);
  const { world } = useRapier();
  const [previous] = useState(() => ({ position: new Vector3(), rotation: new Quaternion() }));
  const [recovery] = useState(() => new CameraDistanceRecovery());
  const recoveryTarget = useRef<CameraFollowTarget | null>(null);
  useEffect(() => () => { aimTarget.current = null; recoil.reset(); }, [aimTarget, recoil]);
  useEffect(() => aim.attach(canvas, window, document, () => enabled() && loadout.canOperate(), () => loadout.getSnapshot().active === 'sniper', loadout.canScope), [aim, canvas, enabled, loadout]);
  useEffect(() => control.attach(canvas, window, document,
    (dx, dy) => orbit.rotate(dx, dy, sensitivity()), clearInput, () => enabled() && !aim.getSnapshot()), [canvas, orbit, control, clearInput, aim, enabled, sensitivity]);
  useEffect(() => orbit.attach(canvas, window, document,
    () => enabled() && (control.getSnapshot() === 'error' || control.getSnapshot() === 'unsupported') && !aim.getSnapshot(), sensitivity), [canvas, orbit, control, aim, enabled, sensitivity]);
  useEffect(() => crosshair.attach(canvas, window, document), [canvas, crosshair]);
  useEffect(() => fire.attach(canvas, window, document, () => enabled() && loadout.canOperate()), [canvas, fire, enabled, loadout]);
  useFrame(({ camera }, dt) => {
    loadout.setScoped(enabled() && aim.getSnapshot());
    aimTarget.current = null;
    if (recoveryTarget.current !== target.current || lifeRevision.current !== respawn.getRevision()) {
      lifeRevision.current = respawn.getRevision();
      recovery.reset();
      recoil.reset();
      recoveryTarget.current = target.current;
    }
    const baseAngles = orbit.step();
    const recoilOffset = recoil.step(dt);
    const angles = applyRecoilPitch(baseAngles, recoilOffset);
    view.current.yaw = angles.yaw;
    previous.position.copy(camera.position);
    previous.rotation.copy(camera.quaternion);
    const aiming = loadout.getSnapshot().scoped;
    if (!(camera instanceof PerspectiveCamera) || !updateFollowCamera(camera, target.current, angles, aiming, aiming ? SNIPER_SCOPE_CONFIG.fov : undefined)) return;
    const position = target.current!.translation();
    const focus = cameraFocus(position, angles.yaw, aiming);
    const avoidance = avoidCameraObstacles(world, camera,
      { x: position.x, y: position.y + CAMERA_CONFIG.focusHeight, z: position.z }, focus, recovery, dt);
    if (avoidance.status !== 'resolved') {
      camera.position.copy(previous.position);
      camera.quaternion.copy(previous.rotation);
    }
    const ray = createScreenAimRay(camera, WEAPON_CONFIGS[loadout.getSnapshot().active].range);
    if (ray) view.current.yaw = Math.atan2(-ray.direction.x, -ray.direction.z);
    aimTarget.current = ray ? targets.aim(world, ray) : null;
    if (import.meta.env.DEV) {
      diagnostics.current += 1;
      if ((recoilOffset > 0 || previousRecoil.current > 0) && (diagnostics.current % 6 === 0 || recoilOffset === 0)) {
        console.info('[recoil.check]', JSON.stringify({ offset: recoilOffset, ...recoil.getState(), basePitch: baseAngles.pitch, pitch: angles.pitch }));
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
  }, -1);
  return null;
}
