import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from 'three';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { CAMERA_CONFIG } from '@bubble-arena/shared';
import { updateFollowCamera, type CameraFollowTarget } from './cameraFollowPose';
import { MouseOrbit } from './MouseOrbit';

export function FollowCamera({ target }: { target: RefObject<CameraFollowTarget | null> }) {
  const diagnostics = useRef(0);
  const [orbit] = useState(() => new MouseOrbit());
  const canvas = useThree(state => state.gl.domElement);
  useEffect(() => orbit.attach(canvas, window, document), [canvas, orbit]);
  useFrame(({ camera }, dt) => {
    const angles = orbit.step(dt);
    if (!(camera instanceof PerspectiveCamera) || !updateFollowCamera(camera, target.current, angles)) return;
    if (import.meta.env.DEV) {
      diagnostics.current += 1;
      if (diagnostics.current === 1 || diagnostics.current % 120 === 0) {
        const position = target.current!.translation();
        console.info('[camera.check]', JSON.stringify({
          target: position, camera: camera.position,
          angles,
          distance: Math.hypot(camera.position.x - position.x - Math.cos(angles.yaw) * CAMERA_CONFIG.shoulderOffset,
            camera.position.y - position.y - CAMERA_CONFIG.focusHeight,
            camera.position.z - position.z + Math.sin(angles.yaw) * CAMERA_CONFIG.shoulderOffset),
          fov: camera.fov,
        }));
      }
    }
  });
  return null;
}
