import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from 'three';
import { useRef, type RefObject } from 'react';
import { CAMERA_CONFIG } from '@bubble-arena/shared';
import { updateFollowCamera, type CameraFollowTarget } from './cameraFollowPose';

export function FollowCamera({ target }: { target: RefObject<CameraFollowTarget | null> }) {
  const diagnostics = useRef(0);
  useFrame(({ camera }) => {
    if (!(camera instanceof PerspectiveCamera) || !updateFollowCamera(camera, target.current)) return;
    if (import.meta.env.DEV) {
      diagnostics.current += 1;
      if (diagnostics.current === 1 || diagnostics.current % 120 === 0) {
        const position = target.current!.translation();
        console.info('[camera.check]', JSON.stringify({
          target: position, camera: camera.position,
          distance: Math.hypot(camera.position.x - position.x - CAMERA_CONFIG.shoulderOffset,
            camera.position.y - position.y - CAMERA_CONFIG.focusHeight, camera.position.z - position.z),
          fov: camera.fov,
        }));
      }
    }
  });
  return null;
}
