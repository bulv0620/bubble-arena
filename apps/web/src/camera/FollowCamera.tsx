import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from 'three';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { CAMERA_CONFIG } from '@bubble-arena/shared';
import { useRapier } from '@react-three/rapier';
import { cameraFocus, updateFollowCamera, type CameraFollowTarget } from './cameraFollowPose';
import { MouseOrbit } from './MouseOrbit';
import { detectCameraObstacle } from './cameraObstacleProbe';

export function FollowCamera({ target }: { target: RefObject<CameraFollowTarget | null> }) {
  const diagnostics = useRef(0);
  const [orbit] = useState(() => new MouseOrbit());
  const canvas = useThree(state => state.gl.domElement);
  const { world } = useRapier();
  useEffect(() => orbit.attach(canvas, window, document), [canvas, orbit]);
  useFrame(({ camera }, dt) => {
    const angles = orbit.step(dt);
    if (!(camera instanceof PerspectiveCamera) || !updateFollowCamera(camera, target.current, angles)) return;
    const position = target.current!.translation();
    const focus = cameraFocus(position, angles.yaw);
    const obstruction = detectCameraObstacle(world, focus, camera.position);
    if (import.meta.env.DEV) {
      diagnostics.current += 1;
      if (diagnostics.current === 1 || diagnostics.current % 120 === 0) {
        console.info('[camera.check]', JSON.stringify({
          target: position, camera: camera.position,
          angles, obstruction, probeRadius: CAMERA_CONFIG.obstacleRadius,
          distance: Math.hypot(camera.position.x - focus.x, camera.position.y - focus.y, camera.position.z - focus.z),
          fov: camera.fov,
        }));
      }
    }
  });
  return null;
}
