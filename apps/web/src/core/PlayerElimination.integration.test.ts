import { beforeAll, expect, test, vi } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { COLLISION_GROUPS, PLAYER_CONFIG } from '@bubble-arena/shared';
import { playerActionPolicy } from '@bubble-arena/game-core';
import { createTrainingSession } from './trainingSession';
import { bindLifeActions } from './bindLifeActions';
import { RapierMovement } from '../player/RapierMovement';
import type { RescueInputState } from '../input/RescueInput';
const at = { x: 10.88, y: .91, z: 0 };
const idle: RescueInputState = { held: false, active: true, move: false, jump: false, fire: false, reload: false, weaponSwitch: false, aim: false };
beforeAll(async () => { await RAPIER.init(); });
function fixture() {
  const world = new RAPIER.World({ x: 0, y: -20, z: 0 }), session = createTrainingSession('sniper'), adapter = new RapierMovement(world);
  world.createCollider(RAPIER.ColliderDesc.cuboid(40, .5, 40).setTranslation(0, -.5, 0).setCollisionGroups(COLLISION_GROUPS.map));
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(at.x, at.y, at.z));
  const collider = world.createCollider(RAPIER.ColliderDesc.capsule(PLAYER_CONFIG.capsuleHalfHeight, PLAYER_CONFIG.radius).setCollisionGroups(COLLISION_GROUPS.player), body); world.step();
  const clear = { clear: vi.fn() }, jump = { consumeJump: vi.fn(() => false) };
  const detach = bindLifeActions(session.playerHealth, session.loadout, { aim: clear, fire: clear, reload: clear, switchInput: clear, keyboard: jump, feedback: session.feedback, recoil: session.recoil });
  const step = (input = idle) => { session.playerHealth.step(); return session.rescue.step(world, at, true, input); };
  return { world, session, adapter, body, collider, clear, jump, step, dispose: () => { detach(); session.rescue.dispose(); adapter.dispose(); world.free(); } };
}
test('real bound health finishing locks weapons and horizontal inertia without changing body/ammo or replaying elimination', () => {
  const f = fixture();
  try {
    f.step(); f.session.loadout.step({ held: true, pressed: true }); const ammo = f.session.loadout.getSnapshot().ammo.magazine;
    for (let i = 0; i < 90; i++) { f.adapter.step(f.body, f.collider, { forward: true, backward: false, left: false, right: false }); f.world.step(); }
    f.session.playerHealth.requestTest('down'); f.step();
    for (const hp of [30, 10, 0]) { expect(f.session.playerHealth.requestTest('hit')).toBe(true); f.step(); expect(f.session.playerHealth.getSnapshot().downedHp).toBe(hp); }
    expect(f.session.loadout.getSnapshot()).toMatchObject({ lifeStatus: 'eliminated', active: 'sniper', ammo: { magazine: ammo } });
    expect(f.session.loadout.canOperate()).toBe(false); expect(f.session.loadout.select(2)).toBe(false); f.session.loadout.setScoped(true); expect(f.session.loadout.getSnapshot().scoped).toBe(false);
    expect(f.session.loadout.step({ held: true, pressed: true }, true)).toBeNull();
    const before = f.body.translation(), bodies = f.world.bodies.len(), colliders = f.world.colliders.len(), policy = playerActionPolicy(f.session.playerHealth.getSnapshot().status);
    const result = f.adapter.step(f.body, f.collider, { forward: false, backward: false, left: false, right: false }, policy.canJump, 0, 1, policy.maximumSpeed ?? undefined)!;
    f.world.step(); expect(Math.hypot(result.desired.x, result.desired.z)).toBe(0); expect(result.jumped).toBe(false);
    expect(f.body.translation().x).toBeCloseTo(before.x, 5); expect(f.body.translation().z).toBeCloseTo(before.z, 5);
    const saved = f.session.playerHealth.getSnapshot(); for (let i = 0; i < 150; i++) f.step();
    expect(f.session.playerHealth.getSnapshot()).toMatchObject({ status: saved.status, hp: saved.hp, downedHp: saved.downedHp, revision: saved.revision }); expect(f.session.playerHealth.requestTest('hit')).toBe(false);
    expect(f.world.bodies.len()).toBe(bodies); expect(f.world.colliders.len()).toBe(colliders);
  } finally { f.dispose(); }
});
test('damage interrupts a genuine receiving-rescue channel and finishing cannot be undone by held helper input', () => {
  const f = fixture();
  try {
    f.session.rescue.configure('self-rescue'); f.step(); f.session.playerHealth.requestTest('down'); f.step();
    for (let i = 0; i < 179; i++) f.step(); expect(f.session.rescue.getSnapshot().channel?.elapsedTicks).toBe(179);
    f.session.playerHealth.requestTest('hit'); const cancelled = f.step(); expect(cancelled.events).toMatchObject([{ kind: 'interrupted', reason: 'damaged' }]);
    expect(f.session.playerHealth.getSnapshot()).toMatchObject({ status: 'downed', downedHp: 30 });
    f.session.playerHealth.requestTest('hit'); f.step(); f.session.playerHealth.requestTest('hit'); f.step();
    for (let i = 0; i < 240; i++) f.step();
    expect(f.session.playerHealth.getSnapshot()).toMatchObject({ status: 'eliminated', hp: 0, revision: 2 }); expect(f.session.rescue.getSnapshot().channel).toBeNull();
    expect(f.session.loadout.getSnapshot().rescuing).toBe(false);
  } finally { f.dispose(); }
});
test('test ally times out under the same health rule; held rescue from too late cannot extend or heal it', () => {
  const f = fixture();
  try {
    f.session.rescue.configure('stationary'); f.step(); for (let i = 0; i < 1190; i++) f.step();
    for (let i = 0; i < 10; i++) f.step({ ...idle, held: true });
    expect(f.session.rescue.getSnapshot().allyHealth).toMatchObject({ status: 'eliminated', eliminationReason: 'downed-timeout', downedHp: 0, revision: 2 });
    expect(f.session.rescue.getSnapshot().channel).toBeNull(); expect(f.session.loadout.getSnapshot().rescuing).toBe(false);
    expect(f.session.loadout.getSpeed()).toBe(4);
    for (let i = 0; i < 240; i++) f.step({ ...idle, held: true }); expect(f.session.rescue.getSnapshot().allyHealth?.status).toBe('eliminated');
  } finally { f.dispose(); }
});
test('queued cleanup/subscriber release and a fresh training session discard terminal state and countdown', () => {
  const f = fixture(), notify = vi.fn(), unsubscribe = f.session.playerHealth.subscribe(notify);
  try {
    f.session.playerHealth.requestTest('down'); f.step(); const calls = notify.mock.calls.length; unsubscribe(); unsubscribe();
    f.session.playerHealth.requestTest('hit'); f.session.playerHealth.clearPending(); f.step(); expect(f.session.playerHealth.getSnapshot().downedHp).toBe(50);
    for (let i = 0; i < 1200; i++) f.step(); expect(f.session.playerHealth.getSnapshot().status).toBe('eliminated'); expect(notify).toHaveBeenCalledTimes(calls);
    const fresh = createTrainingSession('sniper'); fresh.playerHealth.step();
    expect(fresh.playerHealth.getSnapshot()).toMatchObject({ status: 'normal', hp: 100, downedSecondsRemaining: 0, eliminationReason: null });
    expect(fresh.loadout.getSnapshot()).toMatchObject({ active: 'sniper', ammo: { magazine: 5 } }); expect(fresh.rescue.getSnapshot().mode).toBe('off'); fresh.rescue.dispose();
  } finally { unsubscribe(); f.dispose(); }
});
