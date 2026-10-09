import { useEffect, useRef, type RefObject } from 'react';
import { useBeforePhysicsStep, useAfterPhysicsStep, useRapier, type RapierRigidBody } from '@react-three/rapier';
import type { ShotFeedback } from '../effects';
import { rifleSpreadDirection, type RifleShot } from '@bubble-arena/game-core';
import { WEAPON_CONFIGS } from '@bubble-arena/shared';
import type { RifleMotion } from './RifleMotion';
import type { ScreenAimTarget } from './screenAimRay';
import { queryMuzzleRay, type MuzzleRayResult } from './muzzleRay';
import { rifleMuzzlePosition } from './riflePose';
import type { RifleRecoil } from './RifleRecoil';
import type { FireInput } from './FireInput';
import type { ReloadInput } from './ReloadInput';
import type { TrainingTargets } from './TrainingTargets';
import type { LocalRifle } from './LocalRifle';

/** Uses the existing physics callback, never a render dt or UI-owned timer. */
export function RifleSimulation({ input, motion, rifle, reload, body, yaw, target, shotRay, targets, feedback, recoil }: { input: FireInput; motion: RifleMotion; rifle: LocalRifle; reload: ReloadInput;
  body: RefObject<RapierRigidBody | null>; yaw: RefObject<number>; target: RefObject<ScreenAimTarget | null>;
  shotRay: RefObject<MuzzleRayResult | null>; targets: TrainingTargets; feedback: ShotFeedback; recoil: RifleRecoil }) {
  const pending = useRef<{ shot: RifleShot; target: ScreenAimTarget | null; spreadAngle: number; radial: number; azimuth: number } | null>(null);
  const { world } = useRapier();
  useEffect(() => () => { pending.current = null; shotRay.current = null; feedback.clear(); recoil.reset(); }, [shotRay, feedback, recoil]);
  useBeforePhysicsStep(() => {
    const shot = rifle.step(input.consume(), reload.consume());
    const spreadAngle = motion.step(shot !== null);
    pending.current = shot ? { shot, target: target.current, spreadAngle, radial: Math.random(), azimuth: Math.random() } : null;
    if (shot && import.meta.env.DEV) console.info('[weapon.check]', JSON.stringify({ ...shot, ...rifle.getSnapshot() }));
  });
  useAfterPhysicsStep(() => {
    const accepted = pending.current;
    pending.current = null;
    if (!accepted) return;
    recoil.kick(accepted.shot.sequence);
    const center = body.current?.translation(), muzzle = center && rifleMuzzlePosition(center, yaw.current);
    const point = accepted.target?.point;
    const direction = muzzle && point ? rifleSpreadDirection({ x: point.x - muzzle.x, y: point.y - muzzle.y, z: point.z - muzzle.z },
      accepted.spreadAngle, accepted.radial, accepted.azimuth) : null;
    shotRay.current = center && muzzle && accepted.target && direction
      ? queryMuzzleRay(world, center, muzzle, accepted.target, WEAPON_CONFIGS.rifle.range, direction) : null;
    const impact = targets.receiveShotImpact(world, accepted.shot, shotRay.current);
    const received = impact !== null;
    if (muzzle) feedback.emit({ sequence: accepted.shot.sequence, muzzle,
      impact: impact ?? (shotRay.current && shotRay.current.status !== 'clear' ? shotRay.current.point : null) });
    if (import.meta.env.DEV) console.info('[target.hit]', JSON.stringify({ ...accepted.shot, received }));
    if (import.meta.env.DEV) console.info('[shot.ray]', JSON.stringify({ ...accepted.shot, muzzle, spreadAngle: accepted.spreadAngle, result: shotRay.current }));
  });
  return null;
}
