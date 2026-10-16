import { beforeAll, expect, test } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { ARENA_CONFIG, ARENA_SOLIDS, ARENA_SPAWNS, COLLISION_GROUPS, PLAYER_CONFIG } from '@bubble-arena/shared';
import { createTrainingSession } from './trainingSession';
import { RapierMovement } from '../player/RapierMovement';
import { KeyboardInput } from '../player/KeyboardInput';
import { respawnArenaOpponent } from '../player/arenaOpponentRespawn';
beforeAll(async () => { await RAPIER.init(); });
function fixture() {
  const world = new RAPIER.World({ x: 0, y: -20, z: 0 });
  world.createCollider(RAPIER.ColliderDesc.cuboid(ARENA_CONFIG.width / 2, .5, ARENA_CONFIG.length / 2).setTranslation(0, -.5, 0).setCollisionGroups(COLLISION_GROUPS.map));
  for (const s of ARENA_SOLIDS) world.createCollider(RAPIER.ColliderDesc.cuboid(s.size[0] / 2, s.size[1] / 2, s.size[2] / 2)
    .setTranslation(...s.position).setRotation({ x: Math.sin(s.rotation[0] / 2), y: 0, z: 0, w: Math.cos(s.rotation[0] / 2) }).setCollisionGroups(COLLISION_GROUPS.map));
  const s = createTrainingSession('rifle', { arena: true }), bot = s.opponent!;
  const makeBody = (team: 'red' | 'blue') => {
    const p = ARENA_SPAWNS.points.find(p => p.team === team && p.primary)!.position;
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(p.x, p.y, p.z));
    world.createCollider(RAPIER.ColliderDesc.capsule(PLAYER_CONFIG.capsuleHalfHeight, PLAYER_CONFIG.radius).setCollisionGroups(COLLISION_GROUPS.player), body);
    return body;
  };
  const player = makeBody('red'), body = makeBody('blue'), movement = new RapierMovement(world), playerMovement = new RapierMovement(world), keyboard = new KeyboardInput();
  const keyTarget = new EventTarget(), doc = Object.assign(new EventTarget(), { visibilityState: 'visible' as DocumentVisibilityState }), detach = keyboard.attach(keyTarget, doc);
  const key = (code: string, type: 'keydown' | 'keyup') => keyTarget.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), { code }));
  world.step();
  const args = { world, opponent: bot, health: s.playerHealth, body, player, movement, feedback: s.opponentFeedback };
  const step = () => {
    s.playerHealth.step(); const tick = s.playerHealth.getTick(); bot.advance(tick);
    const spawned = respawnArenaOpponent(args);
    playerMovement.step(player, player.collider(0), keyboard.getSnapshot(), keyboard.consumeJump());
    world.step(); s.score.step(tick, bot.drainScoreFacts(), false); return spawned;
  };
  return { s, bot, world, player, args, step, key, keyboard, dispose: () => { detach(); s.dispose(); movement.dispose(); playerMovement.dispose(); world.free(); } };
}
test('actual Rapier vectors cross the spawn boundary and three enemy respawns preserve held movement, jump, weapons and scoring', () => {
  const f = fixture();
  try {
    expect(Object.getPrototypeOf(f.player.translation())).not.toBe(Object.prototype);
    f.step();
    for (let life = 1; life <= 3; life++) {
      f.bot.receiveHit({ tick: f.s.playerHealth.getTick(), sequence: 1 }, 100);
      f.bot.receiveHit({ tick: f.s.playerHealth.getTick(), sequence: 2 }, 300);
      expect(f.bot.getSnapshot().status).toBe('eliminated');
      for (let t = 0; t < 299; t++) expect(f.step()).toBe(false);
      f.key('KeyA', 'keydown'); const before = f.player.translation().x;
      expect(f.step()).toBe(true); expect(f.keyboard.getSnapshot().left).toBe(true);
      expect(f.bot.getSnapshot()).toMatchObject({ status: 'normal', hp: 100, lifeId: life + 1, protected: true });
      for (let t = 0; t < 20; t++) f.step();
      expect(f.player.translation().x).toBeLessThan(before - 1);
      f.key('Space', 'keydown'); f.step(); f.key('Space', 'keyup');
      expect(f.player.linvel().y).toBeGreaterThan(0);
      f.key('KeyA', 'keyup'); f.s.loadout.select(life % 2 ? 2 : 4);
      expect(f.s.loadout.step({ held: true, pressed: true })).not.toBeNull();
      for (let t = 0; t < 130; t++) { f.step(); f.s.loadout.step({ held: false, pressed: false }); }
      expect(f.s.score.getSnapshot().teams.red).toBe(life);
      expect(f.s.playerHealth.getSnapshot()).toMatchObject({ status: 'normal', hp: 100, lifeId: 1 });
    }
  } finally { f.dispose(); }
});
test('blocked enemy spawn waits safely and recovers without touching player control', () => {
  const f = fixture();
  try {
    f.step(); f.bot.receiveHit({ tick: 0, sequence: 1 }, 100); f.bot.receiveHit({ tick: 0, sequence: 2 }, 300);
    for (let t = 0; t < 299; t++) f.step();
    const blocks = ARENA_SPAWNS.points.filter(p => p.team === 'blue').map(p => f.world.createCollider(
      RAPIER.ColliderDesc.cuboid(.6, .6, .6).setTranslation(p.position.x, p.position.y, p.position.z).setCollisionGroups(COLLISION_GROUPS.map)));
    f.world.step(); f.key('KeyA', 'keydown');
    expect(f.step()).toBe(false); expect(f.bot.getSnapshot().status).toBe('respawning');
    expect(f.keyboard.getSnapshot().left).toBe(true);
    blocks.forEach(block => f.world.removeCollider(block, true)); f.world.step();
    expect(f.step()).toBe(true); expect(f.bot.getSnapshot().lifeId).toBe(2);
  } finally { f.dispose(); }
});
