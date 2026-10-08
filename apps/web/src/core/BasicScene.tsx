import { Canvas } from '@react-three/fiber';
import { Suspense, useRef, useState } from 'react';
import type { RapierRigidBody } from '@react-three/rapier';
import { CAMERA_CONFIG, PLAYER_CONFIG, WHITEBOX_CONFIG } from '@bubble-arena/shared';
import { FollowCamera, PointerLockHint, PointerLockInput } from '../camera';
import { WhiteboxMap } from '../maps';
import { CapsulePlayer, useKeyboardInput } from '../player';
import { PhysicsWorld } from './PhysicsWorld';
import { InputDiagnostics } from './InputDiagnostics';

export function BasicScene() {
  const input = useKeyboardInput();
  const playerBody = useRef<RapierRigidBody | null>(null);
  const [pointer] = useState(() => new PointerLockInput());
  return (
    <>
      <Canvas
        camera={{ fov: CAMERA_CONFIG.fov, near: CAMERA_CONFIG.near, far: CAMERA_CONFIG.far }}
        dpr={[1, 1.5]}
        frameloop="always"
        shadows
        fallback={<p className="fallback">当前浏览器无法显示 3D 场景，请启用 WebGL。</p>}
      >
        <color attach="background" args={['#e8eff5']} />
        <ambientLight intensity={0.8} />
        <directionalLight
          position={[8, 12, 6]}
          intensity={2}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-12}
          shadow-camera-right={12}
          shadow-camera-top={12}
          shadow-camera-bottom={-12}
          shadow-camera-near={0.5}
          shadow-camera-far={50}
          shadow-normalBias={0.02}
        />
        <Suspense fallback={null}>
          <PhysicsWorld>
            <WhiteboxMap />
            <CapsulePlayer input={input} bodyRef={playerBody} position={[
              WHITEBOX_CONFIG.playerSpawnXZ[0],
              WHITEBOX_CONFIG.groundTopY + PLAYER_CONFIG.height / 2 + PLAYER_CONFIG.spawnClearance,
              WHITEBOX_CONFIG.playerSpawnXZ[1],
            ]} />
            <FollowCamera target={playerBody} control={pointer} clearInput={input.clear} />
          </PhysicsWorld>
        </Suspense>
      </Canvas>
      <PointerLockHint control={pointer} />
      {import.meta.env.DEV && <InputDiagnostics input={input} />}
    </>
  );
}
