import { useEffect, useRef, type RefObject } from 'react';
import { useBeforePhysicsStep, useAfterPhysicsStep, useRapier, type RapierRigidBody } from '@react-three/rapier';
import type { ShotFeedback } from '../effects';
import { spreadDirection } from '@bubble-arena/game-core';
import { WEAPON_CONFIGS, WEAPON_HANDLING } from '@bubble-arena/shared';
import type { RifleMotion } from './RifleMotion';
import type { ScreenAimTarget } from './screenAimRay';
import { queryMuzzleRay, type MuzzleRayResult } from './muzzleRay';
import { rifleMuzzlePosition } from './riflePose';
import type { RifleRecoil } from './RifleRecoil';
import type { FireInput } from './FireInput';
import type { ReloadInput } from './ReloadInput';
import type { TrainingTargets } from './TrainingTargets';
import type { LocalLoadout, EquippedShot } from './LocalLoadout';
import type { WeaponSwitchInput } from './WeaponSwitchInput';
import type { LocalBubbleFlight } from './LocalBubbleFlight';
import type { AimInput } from '../input';
import type { LocalPlayerHealth } from '../player/LocalPlayerHealth';

/** Existing fixed physics callbacks drive every weapon, never UI/render timers. */
export function RifleSimulation({ playerHealth, aim, input, motion, loadout, switchInput, bubbles, reload, body, yaw, target, shotRay, targets, feedback, recoil }: {
  playerHealth: LocalPlayerHealth;
  aim: AimInput;
  input: FireInput; motion: RifleMotion; loadout: LocalLoadout; switchInput: WeaponSwitchInput; bubbles: LocalBubbleFlight; reload: ReloadInput;
  body: RefObject<RapierRigidBody | null>; yaw: RefObject<number>; target: RefObject<ScreenAimTarget | null>;
  shotRay: RefObject<MuzzleRayResult | null>; targets: TrainingTargets; feedback: ShotFeedback; recoil: RifleRecoil;
}) {
  const pending = useRef<{ shot: EquippedShot; target: ScreenAimTarget | null; samples: readonly { radial: number; azimuth: number }[] } | null>(null);
  const { world } = useRapier();
  useEffect(() => () => { pending.current = null; shotRay.current = null; feedback.clear(); recoil.reset(); bubbles.clear(); }, [shotRay, feedback, recoil, bubbles]);
  useBeforePhysicsStep(() => {
    if (!loadout.canOperate()) { aim.clear(); input.clear(); reload.clear(); switchInput.clear(); }
    const slot = switchInput.consume();
    if (slot && loadout.select(slot)) { input.clear(); reload.clear(); }
    const shot = loadout.step(input.consume(), reload.consume());
    if (shot && playerHealth.onAcceptedFire(shot.sequence) && import.meta.env.DEV) {
      console.info('[player.protection]', JSON.stringify({ reason: 'fire', sequence: shot.sequence, tick: playerHealth.getTick(), ...playerHealth.getSnapshot() }));
    }
    if (loadout.getSnapshot().active === 'sniper' && !loadout.canScope()) aim.clear();
    motion.refresh();
    pending.current = shot ? { shot, target: target.current,
      samples: Array.from({ length: WEAPON_HANDLING[shot.weapon].pellets }, () => ({ radial: Math.random(), azimuth: Math.random() })) } : null;
    if (shot && import.meta.env.DEV) console.info('[weapon.check]', JSON.stringify({ ...shot, ...loadout.getSnapshot().ammo }));
  });
  useAfterPhysicsStep(() => {
    const accepted = pending.current; pending.current = null;
    if (!loadout.canOperate()) shotRay.current = null;
    if (accepted && loadout.canOperate()) {
      const { shot } = accepted, config = WEAPON_CONFIGS[shot.weapon], handling = WEAPON_HANDLING[shot.weapon];
      recoil.kick(shot.sequence);
      const center = body.current?.translation(), muzzle = center && rifleMuzzlePosition(center, yaw.current, shot.weapon);
      const point = accepted.target?.point;
      const results = accepted.samples.map(sample => {
        const direction = muzzle && point ? spreadDirection({ x: point.x - muzzle.x, y: point.y - muzzle.y, z: point.z - muzzle.z },
          shot.angle, sample.radial ** handling.spread.radialPower, sample.azimuth) : null;
        return center && muzzle && accepted.target && direction ? queryMuzzleRay(world, center, muzzle, accepted.target, config.range, direction) : null;
      });
      shotRay.current = results[0] ?? null;
      let impact = null;
      let pellets: ReturnType<TrainingTargets['resolveVolley']>['pellets'] = [];
      if (shot.weapon === 'bubble') {
        const result = results[0];
        if (muzzle && result && result.status !== 'blocked-muzzle') bubbles.flight.spawn(shot.sequence, muzzle, result.direction);
      } else {
        const resolved = targets.resolveVolley(world, shot, results, shot.weapon);
        impact = resolved.impact; pellets = resolved.pellets;
      }
      if (muzzle) feedback.emit({ sequence: shot.sequence, muzzle,
        impact: shot.weapon === 'shotgun' ? null : impact ?? (shot.weapon !== 'bubble' && shotRay.current?.status === 'hit' ? shotRay.current.point : null),
        ...(shot.weapon === 'shotgun' ? { pellets } : {}) });
      if (import.meta.env.DEV) console.info('[shot.ray]', JSON.stringify({ ...shot, muzzle, pellets: results.length, result: shotRay.current }));
    }
    bubbles.step(world, loadout.getTick());
  });
  return null;
}
