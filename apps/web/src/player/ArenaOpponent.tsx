import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react';
import { BallCollider, CapsuleCollider, RigidBody, useAfterPhysicsStep, useBeforePhysicsStep, useRapier, type RapierRigidBody } from '@react-three/rapier';
import { Html } from '@react-three/drei';
import type { Group } from 'three';
import { selectSpawnPoint, playerActionPolicy } from '@bubble-arena/game-core';
import { ARENA_BOT_CONFIG as config, ARENA_SPAWNS, BLOCK_AVATAR_CONFIG as avatar, COLLISION_GROUPS, PLAYER_CONFIG, TRAINING_SCORE_ACTORS as actors } from '@bubble-arena/shared';
import type { LocalArenaOpponent } from './LocalArenaOpponent';
import type { LocalPlayerHealth } from './LocalPlayerHealth';
import type { TrainingTargets } from '../weapons/TrainingTargets';
import type { ShotFeedback } from '../effects/ShotFeedback';
import type { ArenaTelemetry } from '../player/ArenaTelemetry';
import { RapierMovement } from './RapierMovement';
import { isSpawnClear } from './spawnClearance';
import { isRescueLineClear } from './rescueLineOfSight';
import { rifleMuzzlePosition } from '../weapons/riflePose';
import { arenaBotAim, resolveArenaBotShot } from './arenaCombatRay';
import { BlockAvatar } from '../visuals';
import { OpponentOverheadHealth } from '../HUD/OverheadHealth';
export function ArenaOpponent({ opponent, health, targets, player, feedback, telemetry }: { opponent: LocalArenaOpponent; health: LocalPlayerHealth; targets: TrainingTargets; player: RefObject<RapierRigidBody | null>; feedback: ShotFeedback; telemetry: ArenaTelemetry }) {
  const body = useRef<RapierRigidBody>(null), head = useRef<import('@dimforge/rapier3d-compat').Collider>(null), torso = useRef<import('@dimforge/rapier3d-compat').Collider>(null), visual = useRef<Group>(null);
  const { world } = useRapier(), movement = useRef<RapierMovement | null>(null);
  const [pending] = useState(() => ({ shot: null as { sequence: number; yaw: number } | null, sequence: 0 }));
  const state = useSyncExternalStore(opponent.subscribe, opponent.getSnapshot), alive = state.status === 'normal' || state.status === 'downed';
  useEffect(() => { movement.current = new RapierMovement(world); return () => { movement.current?.dispose(); movement.current = null; pending.shot = null; }; }, [world, pending]);
  useEffect(() => {
    if (!head.current || !torso.current) return;
    const h = targets.register(head.current.handle, opponent, 'head'), b = targets.register(torso.current.handle, opponent, 'body');
    return () => { h(); b(); };
  }, [opponent, targets]);
  useBeforePhysicsStep(() => {
    const own = body.current, enemy = player.current, controller = movement.current, tick = health.getTick();
    pending.shot = null;
    if (!own || !enemy || !controller || tick < 0 || !health.canPlay()) return;
    opponent.advance(tick);
    if (opponent.getSnapshot().status === 'respawning') {
      const chosen = selectSpawnPoint('blue', [{ playerId: actors.player.playerId, team: 'red', status: health.getSnapshot().status, position: enemy.translation() }], p => isSpawnClear(world, p), false, ARENA_SPAWNS)!;
      if (isSpawnClear(world, chosen.point.position)) opponent.completeSpawn(() => { controller.reset(); own.setTranslation(chosen.point.position, true); own.setNextKinematicTranslation(chosen.point.position); opponent.setPosition(chosen.point.position); feedback.clear(); return true; });
    }
    const p = own.translation(), q = enemy.translation(), status = opponent.getSnapshot().status;
    const eye = { ...p, y: p.y + .5 }, aim = { ...q, y: q.y + .15 };
    const visible = Math.hypot(p.x - q.x, p.z - q.z) <= config.viewRange && isRescueLineClear(world, eye, aim);
    const intent = opponent.brain.step(tick, p, q, status, health.getSnapshot().status, visible, health.canPlay());
    const policy = playerActionPolicy(status), moving = Math.hypot(intent.x, intent.z) > .01;
    controller.step(own, own.collider(0), { forward: moving && policy.canMove, backward: false, left: false, right: false }, false,
      Math.atan2(-intent.x, -intent.z), config.speed * opponent.getSpeedMultiplier() / PLAYER_CONFIG.speed, policy.maximumSpeed ?? undefined);
    if (visual.current) visual.current.rotation.y = intent.yaw;
    const shot = opponent.fire.step({ held: intent.fire, pressed: intent.fire }, false, policy.canUseWeapons);
    if (shot) { const sequence = ++pending.sequence; opponent.onFire(sequence); pending.shot = { sequence, yaw: intent.yaw }; }
  });
  useAfterPhysicsStep(() => {
    const p = body.current?.translation(), q = player.current?.translation(), tick = health.getTick(), shot = pending.shot; pending.shot = null;
    if (!p || !q || !health.canPlay()) return;
    opponent.setPosition(p); telemetry.update(tick, q, p);
    if (!shot) return;
    const muzzle = rifleMuzzlePosition(p, shot.yaw, 'rifle'); if (!muzzle) return;
    const direction = arenaBotAim(muzzle, q, shot.sequence);
    const validMuzzle = isRescueLineClear(world, { ...p, y: p.y + .1 }, muzzle);
    const hit = validMuzzle && direction ? resolveArenaBotShot(world, muzzle, direction, q) : null;
    const accepted = hit && health.receiveCombatDamage(hit.damage, actors['enemy-a']);
    feedback.emit({ sequence: shot.sequence, muzzle, impact: hit?.point ?? null });
    if (import.meta.env.DEV) console.info('[arena.bot-shot]', JSON.stringify({ tick, sequence: shot.sequence, hit: Boolean(accepted), damage: accepted ? hit.damage : 0, health: health.getSnapshot(), from: p, to: q }));
  });
  const spawn = ARENA_SPAWNS.points.find(p => p.team === 'blue' && p.primary)!.position;
  return <RigidBody ref={body} type="kinematicPosition" colliders={false} position={[spawn.x, spawn.y, spawn.z]}>
    <CapsuleCollider args={[PLAYER_CONFIG.capsuleHalfHeight, PLAYER_CONFIG.radius]} collisionGroups={COLLISION_GROUPS.player} />
    <BallCollider ref={head} sensor args={[avatar.headRadius]} position={[0, avatar.headY, 0]} collisionGroups={COLLISION_GROUPS.trainingTarget} />
    <CapsuleCollider ref={torso} sensor args={[avatar.bodyHalfHeight, avatar.bodyRadius]} position={[0, avatar.bodyY, 0]} collisionGroups={COLLISION_GROUPS.trainingTarget} />
    <group visible={alive}>
      <OpponentOverheadHealth opponent={opponent} />
      <group ref={visual} rotation={[0, Math.PI, 0]}>
        <BlockAvatar headColor="#83c9e5" bodyColor={state.status === 'downed' ? '#b3955b' : '#287bae'} />
        {state.status === 'normal' && <group position={[.4, .12, -.26]}><mesh><boxGeometry args={[.17, .2, .6]} /><meshStandardMaterial color="#405f75" /></mesh><mesh position={[0, .05, -.38]}><boxGeometry args={[.07, .08, .3]} /><meshStandardMaterial color="#e3c378" /></mesh></group>}
      </group>
    </group>
    {!alive && health.canPlay() && <Html center zIndexRange={[30, 0]} position={[0, 1.2, 0]} style={{pointerEvents:'none'}}><span className="arena-respawn-tag">蓝队 AI · {state.respawnSecondsRemaining}s 复活</span></Html>}
  </RigidBody>;
}
