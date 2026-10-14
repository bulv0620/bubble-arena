import { beforeAll, expect, test, vi } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { COLLISION_GROUPS, TRAINING_SCORE_ACTORS as a } from '@bubble-arena/shared';
import { createTrainingSession } from './trainingSession';
import { bindLifeActions } from './bindLifeActions';
import { RapierMovement } from '../player/RapierMovement';
const sourceA = 'enemy-a', sourceB = 'enemy-b';
beforeAll(async () => { await RAPIER.init(); });
function fixture() {
  const world = new RAPIER.World({ x: 0, y: -20, z: 0 }), session = createTrainingSession(), movement = new RapierMovement(world);
  world.createCollider(RAPIER.ColliderDesc.cuboid(40, .5, 40).setTranslation(0, -.5, 0).setCollisionGroups(COLLISION_GROUPS.map));
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(10.88, .92, 0));
  world.createCollider(RAPIER.ColliderDesc.capsule(.55, .35).setCollisionGroups(COLLISION_GROUPS.player), body); world.step();
  const no = { clear: () => {} }, detach = bindLifeActions(session.playerHealth, session.loadout, { aim: no, fire: no, reload: no, switchInput: no, keyboard: { consumeJump: () => false }, recoil: session.recoil, feedback: session.feedback });
  const step = () => { session.playerHealth.step(); session.respawn.step(world, body, movement, () => {}); };
  const down = () => { session.playerHealth.requestTest('down'); step(); };
  const finish = () => { for (let i = 0; i < 3; i++) { session.playerHealth.requestTest('hit'); step(); } };
  return { world, session, step, down, finish, cleanup: () => { detach(); session.rescue.dispose(); movement.dispose(); world.free(); } };
}
test('real health/down/finisher binding awards only at elimination; replay during death and after real spawn cannot add points', () => {
  const f = fixture();
  try {
    f.session.playerHealth.configureTestSource(sourceA); f.down(); expect(f.session.score.getSnapshot().teams.blue).toBe(0);
    f.session.playerHealth.configureTestSource(sourceB); f.finish(); expect(f.session.score.getSnapshot().teams.blue).toBe(1);
    const players = f.session.score.getSnapshot().players; expect(players.find(p => p.playerId === a['enemy-a'].playerId)?.assists).toBe(1); expect(players.find(p => p.playerId === a['enemy-b'].playerId)?.eliminations).toBe(1);
    const score = f.session.score.getSnapshot(), bodies = f.world.bodies.len(), colliders = f.world.colliders.len();
    f.session.playerHealth.requestTest('replay-score'); f.step(); expect(f.session.score.getSnapshot()).toBe(score);
    for (let i = 0; i < 299; i++) f.step(); expect(f.session.playerHealth.getSnapshot()).toMatchObject({ lifeId: 2, hp: 100 });
    f.session.playerHealth.requestTest('replay-score'); f.step(); expect(f.session.score.getSnapshot()).toBe(score);
    for (let i = 0; i < 120; i++) f.step(); f.session.playerHealth.configureTestSource(sourceA); f.down(); f.finish(); expect(f.session.score.getSnapshot().teams.blue).toBe(2);
    expect(f.world.bodies.len()).toBe(bodies); expect(f.world.colliders.len()).toBe(colliders);
  } finally { f.cleanup(); }
});
test('source is captured when intent is queued; timeout preserves that downer rather than later source selection', () => {
  const f = fixture();
  try {
    f.session.playerHealth.configureTestSource(sourceA); f.session.playerHealth.requestTest('down'); f.session.playerHealth.configureTestSource(sourceB); f.step();
    f.session.playerHealth.requestTest('hit'); f.step(); for (let i = 0; i < 1199; i++) f.step();
    expect(f.session.score.getSnapshot().teams.blue).toBe(1); const resolution = f.session.score.getSnapshot().lastEvents[0];
    expect(resolution).toMatchObject({ fact: { cause: 'downed-timeout' }, killer: a['enemy-a'], assistant: null });
  } finally { f.cleanup(); }
});
test('unowned test deaths and training-target defeat do not give team points; reset has a fresh scoreboard and replay scope', () => {
  const f = fixture();
  try {
    f.session.range.entries[0].target.receiveHit({ tick: 0, sequence: 1 }, 100); f.step(); expect(f.session.score.getSnapshot().teams.blue).toBe(0);
    f.down(); f.finish(); expect(f.session.score.getSnapshot().teams).toEqual({ red: 0, blue: 0 }); expect(f.session.playerHealth.canReplayScore()).toBe(true);
    const fresh = createTrainingSession(); expect(fresh.score.getSnapshot().teams).toEqual({ red: 0, blue: 0 }); expect(fresh.playerHealth.canReplayScore()).toBe(false); expect(fresh.playerHealth.requestTest('replay-score')).toBe(false);
    fresh.rescue.dispose();
  } finally { f.cleanup(); }
});
test('score subscriptions fire once per elimination; unsubscription and pending replay cancellation are idempotent', () => {
  const f = fixture(), listener = vi.fn(), release = f.session.score.subscribe(listener);
  try {
    f.session.playerHealth.configureTestSource(sourceA); f.down(); expect(listener).not.toHaveBeenCalled(); f.finish(); expect(listener).toHaveBeenCalledTimes(1);
    f.session.playerHealth.requestTest('replay-score'); f.session.playerHealth.clearPending(); f.step(); expect(listener).toHaveBeenCalledTimes(1);
    release(); release(); for (let i = 0; i < 420; i++) f.step(); f.down(); f.finish(); expect(f.session.score.getSnapshot().teams.blue).toBe(2); expect(listener).toHaveBeenCalledTimes(1);
  } finally { release(); f.cleanup(); }
});
