import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { CAMERA_CONFIG } from '@bubble-arena/shared';
import { useRapier } from '@react-three/rapier';
import { cameraFocus, updateFollowCamera, type CameraFollowTarget } from './cameraFollowPose';
import { MouseOrbit } from './MouseOrbit';
import { avoidCameraObstacles } from './cameraAvoidance';

export function FollowCamera({ target }: { target: RefObject<CameraFollowTarget | null> }) {
  const diagnostics = useRef(0);
  const [orbit] = useState(() => new MouseOrbit());
  const canvas = useThree(state => state.gl.domElement);
  const { world } = useRapier();
  const [previous] = useState(() => ({ position: new Vector3(), rotation: new Quaternion() }));
  useEffect(() => orbit.attach(canvas, window, document), [canvas, orbit]);
  useFrame(({ camera }, dt) => {
    const angles = orbit.step(dt);
    previous.position.copy(camera.position);
    previous.rotation.copy(camera.quaternion);
    if (!(camera instanceof PerspectiveCamera) || !updateFollowCamera(camera, target.current, angles)) return;
    const position = target.current!.translation();
    const focus = cameraFocus(position, angles.yaw);
    const avoidance = avoidCameraObstacles(world, camera,
      { x: position.x, y: position.y + CAMERA_CONFIG.focusHeight, z: position.z }, focus);
    if (avoidance.status !== 'resolved') {
      camera.position.copy(previous.position);
      camera.quaternion.copy(previous.rotation);
    }
    if (import.meta.env.DEV) {
      diagnostics.current += 1;
      if (diagnostics.current === 1 || diagnostics.current % 120 === 0) {
        console.info('[camera.check]', JSON.stringify({
          target: position, camera: camera.position,
          angles, avoidance, probeRadius: CAMERA_CONFIG.obstacleRadius,
          distance: avoidance.status === 'resolved' ? avoidance.distance : null,
          fov: camera.fov,
        }));
      }
    }
  });
  return null;
}
