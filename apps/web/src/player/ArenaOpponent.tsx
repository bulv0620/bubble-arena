import { ToyWeapon } from '../weapons/RiflePlaceholder';
import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react';
import { BallCollider, CapsuleCollider, RigidBody, useAfterPhysicsStep, useBeforePhysicsStep, useRapier, type RapierRigidBody } from '@react-three/rapier';
import type { Group } from 'three';
import { playerActionPolicy } from '@bubble-arena/game-core';
import { ARENA_BOT_CONFIG as config, BLOCK_AVATAR_CONFIG as avatar, BUBBLE_TRAP_CONFIG, COLLISION_GROUPS, PLAYER_CONFIG, type RescuePosition } from '@bubble-arena/shared';
import type { LocalArenaOpponent } from './LocalArenaOpponent';
import type { LocalPlayerHealth } from './LocalPlayerHealth';
import type { TrainingTargets } from '../weapons/TrainingTargets';
import type { ShotFeedback } from '../effects/ShotFeedback';
import { arenaCombatants, selectArenaBotTarget, resolveArenaTeamShot } from './arenaBotCombat';
import type { LocalArenaInteractions } from './LocalArenaInteractions';
import { RapierMovement } from './RapierMovement';
import { respawnArenaOpponent } from './arenaOpponentRespawn';
import { isRescueLineClear } from './rescueLineOfSight';
import { rifleMuzzlePosition } from '../weapons/riflePose';
import { arenaBotAim } from './arenaCombatRay';
import { BubbleAvatar } from '../visuals';
import { OpponentOverheadHealth } from '../HUD/OverheadHealth';
import { ShotEffects } from '../effects/ShotEffects';
export function ArenaOpponent({ opponent, health, targets, player, feedback, bots, interaction }: { interaction: LocalArenaInteractions; opponent: LocalArenaOpponent; health: LocalPlayerHealth; targets: TrainingTargets; player: RefObject<RapierRigidBody | null>; feedback: ShotFeedback; bots: readonly LocalArenaOpponent[] }) {
  const body = useRef<RapierRigidBody>(null), head = useRef<import('@dimforge/rapier3d-compat').Collider>(null), torso = useRef<import('@dimforge/rapier3d-compat').Collider>(null), visual = useRef<Group>(null);
  const bubbleSensor=useRef<import('@dimforge/rapier3d-compat').Collider>(null);
  const muzzleAnchor = useRef<Group | null>(null);
  const { world } = useRapier(), movement = useRef<RapierMovement | null>(null);
  const [pending] = useState(() => ({ shot: null as { sequence: number; yaw: number; target: RescuePosition } | null, sequence: 0, targetId: null as string | null }));
  const state = useSyncExternalStore(opponent.subscribe, opponent.getSnapshot), alive = state.status === 'normal' || state.status === 'downed';
  useEffect(() => { movement.current = new RapierMovement(world); return () => { movement.current?.dispose(); movement.current = null; pending.shot = null; }; }, [world, pending]);
  useEffect(() => {
    if (!head.current || !torso.current || !bubbleSensor.current) return;
    const enemy = opponent.actor.teamId !== health.actor.teamId;
    const h = targets.register(head.current.handle, opponent, 'head',()=>enemy&&opponent.getSnapshot().status==='normal'), b = targets.register(torso.current.handle, opponent, 'body',()=>enemy&&opponent.getSnapshot().status==='normal');
    const bubble=targets.register(bubbleSensor.current.handle,opponent,'body',()=>opponent.getSnapshot().status==='downed','bubble');
    return () => { h(); b(); bubble(); };
  }, [opponent, targets, health.actor.teamId]);
  useBeforePhysicsStep(() => {
    const own = body.current, enemy = player.current, controller = movement.current, tick = health.getTick();
    pending.shot = null;
    if (!own || !enemy || !controller || tick < 0 || !health.canPlay()) return;
    opponent.advance(tick);
    opponent.setPosition(own.translation());
    const candidates = arenaCombatants(bots, health, enemy.translation());
    respawnArenaOpponent({ world, opponent, health, body: own, player: enemy, movement: controller, feedback,
      others: candidates.map(c=>({playerId:c.actor.playerId,team:c.actor.teamId,status:c.status,position:c.position})) });
    const p = own.translation(), status = opponent.getSnapshot().status;
    const target = selectArenaBotTarget(world, opponent.actor, p, candidates);
    if (pending.targetId !== (target?.actor.playerId ?? null)) { opponent.brain.reset(); pending.targetId = target?.actor.playerId ?? null; }
    let intent = opponent.brain.step(tick, p, target?.position ?? p, status, target?.status ?? 'respawning', Boolean(target), health.canPlay());
    const bubble = interaction.approachTarget(world,opponent,enemy.translation());
    if(bubble&&status==='normal'){
      const dx=bubble.x-p.x,dz=bubble.z-p.z,d=Math.hypot(dx,dz),move=d>1.6;
      intent={x:move?dx/d:0,z:move?dz/d:0,yaw:Math.atan2(-dx,-dz),fire:false};
    }
    const acting = interaction.isActing(opponent.actor.playerId);
    const policy = playerActionPolicy(status), moving = Math.hypot(intent.x, intent.z) > .01;
    const moved = controller.step(own, own.collider(0), { forward: moving && policy.canMove, backward: false, left: false, right: false }, false,
      Math.atan2(-intent.x, -intent.z), config.speed * opponent.getSpeedMultiplier() / PLAYER_CONFIG.speed, acting ? 0 : policy.maximumSpeed ?? undefined);
    opponent.grounded = moved?.grounded ?? false;
    opponent.facingYaw = intent.yaw;
    if (visual.current) visual.current.rotation.y = intent.yaw;
    const shot = opponent.fire.step({ held: intent.fire, pressed: intent.fire }, false, policy.canUseWeapons && !acting);
    if (shot && target) { const sequence = ++pending.sequence; opponent.onFire(sequence); pending.shot = { sequence, yaw: intent.yaw, target: target.position }; }
  });
  useAfterPhysicsStep(() => {
    const p = body.current?.translation(), q = player.current?.translation(), tick = health.getTick(), shot = pending.shot; pending.shot = null;
    if (!p || !q || !health.canPlay()) return;
    opponent.setPosition(p);
    if (!shot) return;
    const muzzle = rifleMuzzlePosition(p, shot.yaw, 'rifle'); if (!muzzle) return;
    const direction = arenaBotAim(muzzle, shot.target, shot.sequence);
    const validMuzzle = isRescueLineClear(world, { ...p, y: p.y + .1 }, muzzle);
    const hit = validMuzzle && direction ? resolveArenaTeamShot(world, opponent.actor, muzzle, direction, arenaCombatants(bots, health, q)) : null;
    feedback.emit({ sequence: shot.sequence, weapon: 'rifle', muzzle, impact: null, pellets: hit ? [hit.pellet] : [] });
    if (import.meta.env.DEV) console.info('[arena.bot-shot]', JSON.stringify({ tick, sequence: shot.sequence, hits: hit?.hits.map(h => ({ playerId: h.victim.actor.playerId, damage: h.damage, accepted: h.accepted })), health: health.getSnapshot(), from: p, to: q }));
  });
  const spawn = opponent.spawn, red = opponent.actor.teamId === 'red';
  return <><RigidBody ref={body} type="kinematicPosition" colliders={false} position={[spawn.x, spawn.y, spawn.z]}>
    <CapsuleCollider args={[PLAYER_CONFIG.capsuleHalfHeight, PLAYER_CONFIG.radius]} collisionGroups={COLLISION_GROUPS.player} />
    <BallCollider ref={head} sensor args={[avatar.headRadius]} position={[0, avatar.headY, 0]} collisionGroups={COLLISION_GROUPS.trainingTarget} />
    <CapsuleCollider ref={torso} sensor args={[avatar.bodyHalfHeight, avatar.bodyRadius]} position={[0, avatar.bodyY, 0]} collisionGroups={COLLISION_GROUPS.trainingTarget} />
    <BallCollider ref={bubbleSensor} sensor args={[BUBBLE_TRAP_CONFIG.radius]} position={[0,BUBBLE_TRAP_CONFIG.centerY,0]} collisionGroups={COLLISION_GROUPS.trainingTarget} />
    <group visible={alive}>
      <OpponentOverheadHealth opponent={opponent} allied={opponent.actor.teamId===health.actor.teamId} />
      <group ref={visual} rotation={[0, Math.PI, 0]}>
        <BubbleAvatar bubbled={state.status==='downed'} headColor={red ? '#f2aa92' : '#83c9e5'} bodyColor={state.status === 'downed' ? '#b3955b' : red ? '#c85f52' : '#287bae'} />
        {state.status === 'normal' && <ToyWeapon weapon="rifle" muzzleAnchor={muzzleAnchor}/>}
      </group>
    </group>

  </RigidBody><ShotEffects feedback={feedback} muzzleAnchor={muzzleAnchor}/></>;
}
