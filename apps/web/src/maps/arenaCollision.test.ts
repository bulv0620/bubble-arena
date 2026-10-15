import { beforeAll, expect, test } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { ARENA_SOLIDS, ARENA_SPAWNS, ARENA_CONFIG, COLLISION_GROUPS, PLAYER_CONFIG } from '@bubble-arena/shared';
import { isSpawnClear } from '../player/spawnClearance';
import { isRescueLineClear } from '../player/rescueLineOfSight';
import { RapierMovement } from '../player/RapierMovement';
beforeAll(async () => { await RAPIER.init(); });
export function arenaWorld() {
  const world = new RAPIER.World({ x: 0, y: -20, z: 0 });
  world.createCollider(RAPIER.ColliderDesc.cuboid(ARENA_CONFIG.width / 2, .5, ARENA_CONFIG.length / 2).setTranslation(0, -.5, 0).setCollisionGroups(COLLISION_GROUPS.map));
  for (const s of ARENA_SOLIDS) world.createCollider(RAPIER.ColliderDesc.cuboid(s.size[0] / 2, s.size[1] / 2, s.size[2] / 2).setTranslation(...s.position).setRotation({ x: Math.sin(s.rotation[0] / 2), y: 0, z: 0, w: Math.cos(s.rotation[0] / 2) }).setCollisionGroups(COLLISION_GROUPS.map));
  world.step(); return world;
}
test('all eight spawns have capsule clearance; every opposing spawn pair is hidden by real geometry', () => {
  const world = arenaWorld();
  try {
    for (const p of ARENA_SPAWNS.points) expect(isSpawnClear(world, p.position), p.id).toBe(true);
    for (const red of ARENA_SPAWNS.points.filter(p => p.team === 'red')) for (const blue of ARENA_SPAWNS.points.filter(p => p.team === 'blue')) {
      expect(isRescueLineClear(world, { ...red.position, y: 1.5 }, { ...blue.position, y: 1.5 }), `${red.id}->${blue.id}`).toBe(false);
    }
  } finally { world.free(); }
});
test.each([-1, 1])('real capsule ascends the %i ramp, traverses deck and descends without jumping', side => {
  const world = arenaWorld(), movement = new RapierMovement(world);
  try {
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(14, .92, side * 15));
    const collider = world.createCollider(RAPIER.ColliderDesc.capsule(PLAYER_CONFIG.capsuleHalfHeight, PLAYER_CONFIG.radius).setCollisionGroups(COLLISION_GROUPS.player), body); world.step();
    let high = 0;
    for (let tick = 0; tick < 450; tick++) { movement.step(body, collider, { forward: true, backward: false, left: false, right: false }, false, side > 0 ? 0 : Math.PI); world.step(); high = Math.max(high, body.translation().y); }
    expect(high).toBeGreaterThan(2.35); expect(body.translation().z * side).toBeLessThan(-15); expect(body.translation().y).toBeLessThan(1);
  } finally { movement.dispose(); world.free(); }
});

test('kinematic opponent head/body accept real registered rays, wall blocks both directions, bubble slow obeys life protection', async () => {
  const { createTrainingSession } = await import('../core/trainingSession');
  const { BLOCK_AVATAR_CONFIG: avatar } = await import('@bubble-arena/shared');
  const { queryScreenAimTarget } = await import('../weapons/screenAimRay');
  const { queryMuzzleRay } = await import('../weapons/muzzleRay');
  const { resolveArenaBotShot } = await import('../player/arenaCombatRay');
  const world = arenaWorld(), s = createTrainingSession('rifle', { arena: true }), bot = s.opponent!;
  try {
    s.playerHealth.step(); bot.advance(0);
    const p = { x: -14, y: .92, z: 0 }, rigid = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(p.x, p.y, p.z));
    const head = world.createCollider(RAPIER.ColliderDesc.ball(avatar.headRadius).setTranslation(0, avatar.headY, 0).setSensor(true).setCollisionGroups(COLLISION_GROUPS.trainingTarget), rigid);
    const torso = world.createCollider(RAPIER.ColliderDesc.capsule(avatar.bodyHalfHeight, avatar.bodyRadius).setTranslation(0, avatar.bodyY, 0).setSensor(true).setCollisionGroups(COLLISION_GROUPS.trainingTarget), rigid);
    s.targets.register(head.handle, bot, 'head'); s.targets.register(torso.handle, bot, 'body'); world.step();
    const origin = { x: -14, y: p.y + avatar.headY, z: 6 }, ray = { origin, direction: { x: 0, y: 0, z: -1 }, range: 30 };
    const aimed = s.targets.aim(world, ray)!; expect(aimed.colliderHandle).toBe(head.handle);
    const result = queryMuzzleRay(world, { ...origin, z: 6.1 }, origin, aimed)!;
    expect(s.targets.receiveShotImpact(world, { tick: 0, sequence: 1 }, result)).not.toBeNull(); expect(bot.getSnapshot().hp).toBe(60);
    expect(s.targets.receiveShotImpact(world, { tick: 0, sequence: 1 }, result)).toBeNull(); expect(bot.getSnapshot().hp).toBe(60);
    expect(resolveArenaBotShot(world, origin, ray.direction, p)?.region).toBe('head');
    const wall = world.createCollider(RAPIER.ColliderDesc.cuboid(2, 2, .25).setTranslation(-14, 2, 3).setCollisionGroups(COLLISION_GROUPS.map)); world.step();
    expect(resolveArenaBotShot(world, origin, ray.direction, p)).toBeNull();
    const map = queryScreenAimTarget(world, ray)!; expect(map.colliderHandle).toBe(wall.handle); expect(s.targets.aim(world, ray)?.colliderHandle).toBe(wall.handle);
    bot.applySlow(); expect(bot.getSpeedMultiplier()).toBe(.5);
    expect(s.targets.receiveExplosion(world, { tick: 0, sequence: 10 }, { x: -14, y: 1, z: .5 })).toBe(1); expect(bot.getSnapshot().hp).toBe(35);
    s.playerHealth.step(); bot.advance(1); expect(s.targets.receiveExplosion(world, { tick: 1, sequence: 10 }, { x: -14, y: 1, z: .5 })).toBe(0);
    world.removeCollider(wall, true); world.step();
    for (let sequence = 2; sequence <= 4; sequence++) s.targets.receiveShotImpact(world, { tick: 1, sequence }, result);
    expect(bot.getSnapshot().status).toBe('eliminated'); s.score.step(1, bot.drainScoreFacts(), false); expect(s.score.getSnapshot().teams.red).toBe(1);
    expect(s.targets.isRegistered(head.handle)).toBe(false); // corpses cannot intercept new bubbles
    const afterDeath = bot.getSnapshot(); for (let tick = 2; tick <= 300; tick++) bot.advance(tick); expect(bot.getSnapshot().status).toBe('eliminated');
    bot.advance(301); expect(bot.getSnapshot().status).toBe('respawning'); expect(bot.completeSpawn(() => true)).toBe(true);
    expect(bot.getSnapshot()).toMatchObject({ status: 'normal', hp: 100, lifeId: 2, protected: true });
    expect(bot.receiveHit({ tick: 301, sequence: 100 }, 20)).toBe(false); expect(bot.getSnapshot().hp).toBe(100); expect(afterDeath.respawnSecondsRemaining).toBe(5);
  } finally { s.dispose(); world.free(); }
});

test('both real health eliminations are submitted together, draw and restart retire all opponent state', async () => {
  const { createTrainingSession, restartTrainingSession } = await import('../core/trainingSession');
  const { TRAINING_SCORE_ACTORS: actors } = await import('@bubble-arena/shared');
  const s = createTrainingSession('sniper', { arena: true, match: true, config: { countdownSeconds: 1, durationSeconds: 300, scoreLimit: 1 } });
  s.match.setSceneReady(true); s.match.requestStart(); for (let i = 0; i <= 60; i++) s.match.step();
  s.playerHealth.step(); s.opponent!.advance(0);
  s.playerHealth.receiveCombatDamage(100, actors['enemy-a']); s.playerHealth.receiveCombatDamage(50, actors['enemy-a']);
  s.opponent!.receiveHit({ tick: 0, sequence: 1 }, 100); s.opponent!.receiveHit({ tick: 0, sequence: 2 }, 50);
  const facts = [...s.playerHealth.drainScoreFacts(), ...s.opponent!.drainScoreFacts()]; expect(facts).toHaveLength(2);
  s.score.step(0, facts, false); s.match.resolve(s.score.getSnapshot()); expect(s.match.getSnapshot().result).toMatchObject({ winner: null, teams: { red: 1, blue: 1 } });
  const state = s.opponent!.getSnapshot(); s.opponent!.advance(2000); expect(s.opponent!.getSnapshot()).toBe(state);
  const fresh = restartTrainingSession(s); expect(fresh.arena).toBe(true); expect(fresh.opponent!.getSnapshot()).toMatchObject({ hp: 100, status: 'normal', lifeId: 1 }); expect(fresh.score.getSnapshot().teams).toEqual({ red: 0, blue: 0 });
  expect(s.opponent!.receiveHit({ tick: 1, sequence: 3 }, 20)).toBe(false); expect(fresh.match.getSnapshot().phase).toBe('waiting'); fresh.dispose();
});


test('actual bot aim uses radians, hits in open space and never damages through a wall', async () => {
  const { arenaBotAim, resolveArenaBotShot } = await import('../player/arenaCombatRay');
  const world = arenaWorld(), victim = { x: -14, y: .92, z: 0 }, origin = { x: -14, y: 1.27, z: 10 };
  try {
    let hits = 0;
    for (let i = 1; i <= 100; i++) {
      const direction = arenaBotAim(origin, victim, i)!; expect(direction).not.toBeNull(); expect(Math.hypot(direction.x, direction.y, direction.z)).toBeCloseTo(1);
      if (resolveArenaBotShot(world, origin, direction, victim)) hits++;
    }
    expect(hits).toBeGreaterThan(20); expect(hits).toBeLessThan(100);
    world.createCollider(RAPIER.ColliderDesc.cuboid(2, 2, .25).setTranslation(-14, 2, 5).setCollisionGroups(COLLISION_GROUPS.map)); world.step();
    for (let i = 1; i <= 100; i++) expect(resolveArenaBotShot(world, origin, arenaBotAim(origin, victim, i)!, victim)).toBeNull();
  } finally { world.free(); }
});


test.each([
  { name: 'left lane', points: [[-6, 22], [-6, 14], [-14, 14], [-14, -14], [-6, -14], [-6, -22]] },
  { name: 'mid courtyard', points: [[-6, 22], [-6, 14], [0, 14], [4.3, 3], [4.3, -8], [0, -14], [-6, -14], [-6, -22]] },
])('$name connects red and blue using the actual capsule controller', ({ points }) => {
  const world = arenaWorld(), movement = new RapierMovement(world);
  try {
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(points[0][0], .92, points[0][1]));
    const collider = world.createCollider(RAPIER.ColliderDesc.capsule(PLAYER_CONFIG.capsuleHalfHeight, PLAYER_CONFIG.radius).setCollisionGroups(COLLISION_GROUPS.player), body); world.step();
    for (const [x, z] of points.slice(1)) {
      let reached = false;
      for (let tick = 0; tick < 600; tick++) {
        const p = body.translation(), dx = x - p.x, dz = z - p.z;
        if (Math.hypot(dx, dz) < .55) { reached = true; break; }
        movement.step(body, collider, { forward: true, backward: false, left: false, right: false }, false, Math.atan2(-dx, -dz)); world.step();
      }
      expect(reached, `waypoint ${x},${z}; body ${JSON.stringify(body.translation())}`).toBe(true);
    }
  } finally { movement.dispose(); world.free(); }
});
