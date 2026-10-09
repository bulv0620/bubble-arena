import { useEffect, useRef, type RefObject } from 'react';
import { useBeforePhysicsStep, useAfterPhysicsStep, useRapier, type RapierRigidBody } from '@react-three/rapier';
import type { RifleShot } from '@bubble-arena/game-core';
import type { ScreenAimTarget } from './screenAimRay';
import { queryMuzzleRay, type MuzzleRayResult } from './muzzleRay';
import { rifleMuzzlePosition } from './riflePose';
import type { FireInput } from './FireInput';
import type { ReloadInput } from './ReloadInput';
import type { TrainingTargets } from './TrainingTargets';
import type { LocalRifle } from './LocalRifle';

/** Uses the existing physics callback, never a render dt or UI-owned timer. */
export function RifleSimulation({ input, rifle, reload, body, yaw, target, shotRay, targets }: { input: FireInput; rifle: LocalRifle; reload: ReloadInput;
  body: RefObject<RapierRigidBody | null>; yaw: RefObject<number>; target: RefObject<ScreenAimTarget | null>;
  shotRay: RefObject<MuzzleRayResult | null>; targets: TrainingTargets }) {
  const pending = useRef<{ shot: RifleShot; target: ScreenAimTarget | null } | null>(null);
  const { world } = useRapier();
  useEffect(() => () => { pending.current = null; shotRay.current = null; }, [shotRay]);
  useBeforePhysicsStep(() => {
    const shot = rifle.step(input.consume(), reload.consume());
    pending.current = shot ? { shot, target: target.current } : null;
    if (shot && import.meta.env.DEV) console.info('[weapon.check]', JSON.stringify({ ...shot, ...rifle.getSnapshot() }));
  });
  useAfterPhysicsStep(() => {
    const accepted = pending.current;
    pending.current = null;
    if (!accepted) return;
    const center = body.current?.translation(), muzzle = center && rifleMuzzlePosition(center, yaw.current);
    shotRay.current = center && muzzle && accepted.target ? queryMuzzleRay(world, center, muzzle, accepted.target) : null;
    const received = targets.receiveShot(world, accepted.shot, shotRay.current);
    if (import.meta.env.DEV) console.info('[target.hit]', JSON.stringify({ ...accepted.shot, received }));
    if (import.meta.env.DEV) console.info('[shot.ray]', JSON.stringify({ ...accepted.shot, muzzle, result: shotRay.current }));
  });
  return null;
}
