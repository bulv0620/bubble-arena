import { createPlayerVitals } from '@bubble-arena/game-core';
import { ShotFeedback, ShotEffects } from '../effects';
import { Canvas } from '@react-three/fiber';
import { Suspense, useEffect, useCallback, useRef, useState } from 'react';
import { AimInput, AimHint, CrosshairInput } from '../input';
import { Crosshair, AmmoHint, TrainingTargetHint, HealthHint } from '../HUD';
import type { RapierRigidBody } from '@react-three/rapier';
import { CAMERA_CONFIG, PLAYER_CONFIG, WHITEBOX_CONFIG, TRAINING_RANGE_CONFIG, type CameraHeading } from '@bubble-arena/shared';
import { FollowCamera, PointerLockHint, PointerLockInput } from '../camera';
import { WhiteboxMap } from '../maps';
import { CapsulePlayer, useKeyboardInput } from '../player';
import { PhysicsWorld } from './PhysicsWorld';
import { InputDiagnostics } from './InputDiagnostics';
import { RifleRecoil, TrainingTarget, TrainingTargets, LocalTrainingRange, MuzzleAimDiagnostics, type MuzzleRayResult, AimTargetMarker, type ScreenAimTarget, ReloadInput, FireInput, FireInputHint, LocalRifle, RifleSimulation } from '../weapons';

export function BasicScene() {
  const input = useKeyboardInput();
  const playerBody = useRef<RapierRigidBody | null>(null);
  const [pointer] = useState(() => new PointerLockInput());
  const [aim] = useState(() => new AimInput());
  const [fire] = useState(() => new FireInput(pointer, aim));
  const [reload] = useState(() => new ReloadInput());
  useEffect(() => reload.attach(window, document), [reload]);
  const [range] = useState(() => new LocalTrainingRange());
  const [targets] = useState(() => new TrainingTargets());
  const [playerVitals] = useState(() => createPlayerVitals());
  const [recoil] = useState(() => new RifleRecoil());
  const [feedback] = useState(() => new ShotFeedback());
  const [rifle] = useState(() => new LocalRifle());
  const [crosshair] = useState(() => new CrosshairInput(pointer, aim));
  const clearInput = useCallback(() => { input.clear(); aim.clear(); fire.clear(); reload.clear(); }, [input, aim, fire, reload]);
  const facingYaw = useRef(0);
  const shotRay = useRef<MuzzleRayResult | null>(null);
  const aimTarget = useRef<ScreenAimTarget | null>(null);
  const view = useRef<CameraHeading>({ yaw: 0 });
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
            {range.entries.map(entry => <TrainingTarget key={entry.id} registry={targets} target={entry.target} position={entry.position} />)}
            <CapsulePlayer input={input} bodyRef={playerBody} view={view} aim={aim} facingYaw={facingYaw} position={[
              TRAINING_RANGE_CONFIG.playerSpawnXZ[0],
              WHITEBOX_CONFIG.groundTopY + PLAYER_CONFIG.height / 2 + PLAYER_CONFIG.spawnClearance,
              TRAINING_RANGE_CONFIG.playerSpawnXZ[1],
            ]} />
            <RifleSimulation input={fire} rifle={rifle} reload={reload} body={playerBody} yaw={facingYaw} target={aimTarget} shotRay={shotRay} targets={targets} feedback={feedback} recoil={recoil} />
            <ShotEffects feedback={feedback} />
            <FollowCamera target={playerBody} control={pointer} clearInput={clearInput} view={view} aim={aim} crosshair={crosshair} fire={fire} aimTarget={aimTarget} targets={targets} recoil={recoil} />
            {import.meta.env.DEV && <>
              <AimTargetMarker target={aimTarget} />
              <MuzzleAimDiagnostics body={playerBody} yaw={facingYaw} target={aimTarget} />
            </>}
          </PhysicsWorld>
        </Suspense>
      </Canvas>
      <PointerLockHint control={pointer} />
      <AimHint input={aim} />
      <HealthHint player={playerVitals} />
      <AmmoHint rifle={rifle} />
      <TrainingTargetHint range={range} />
      <Crosshair input={crosshair} />
      <FireInputHint input={fire} pointer={pointer} />
      {import.meta.env.DEV && <InputDiagnostics input={input} />}
    </>
  );
}
