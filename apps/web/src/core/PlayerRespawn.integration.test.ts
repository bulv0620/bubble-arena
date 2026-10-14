import { beforeAll, expect, test, vi } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { COLLISION_GROUPS, PRIMARY_WEAPON_IDS, WEAPON_CONFIGS, WHITEBOX_SPAWNS, PLAYER_CONFIG } from '@bubble-arena/shared';
import { createTrainingSession } from './trainingSession';
import { bindLifeActions } from './bindLifeActions';
import { RapierMovement } from '../player/RapierMovement';
beforeAll(async () => { await RAPIER.init(); });
const fire = { held: true, pressed: true };
function fixture(primary: typeof PRIMARY_WEAPON_IDS[number] = 'sniper') {
  const world = new RAPIER.World({ x: 0, y: -20, z: 0 }), session = createTrainingSession(primary), movement = new RapierMovement(world);
  world.createCollider(RAPIER.ColliderDesc.cuboid(40, .5, 40).setTranslation(0, -.5, 0).setCollisionGroups(COLLISION_GROUPS.map));
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(-1, 10, 12));
  const collider = world.createCollider(RAPIER.ColliderDesc.capsule(PLAYER_CONFIG.capsuleHalfHeight, PLAYER_CONFIG.radius).setCollisionGroups(COLLISION_GROUPS.player), body); world.step();
  const clear = { clear: vi.fn() }, clearInput = vi.fn();
  const detach = bindLifeActions(session.playerHealth, session.loadout, { aim: clear, fire: clear, reload: clear, switchInput: clear,
    keyboard: { consumeJump: () => false }, recoil: session.recoil, feedback: session.feedback });
  const step = () => { session.playerHealth.step(); return session.respawn.step(world, body, movement, clearInput); };
  const eliminate = () => { session.playerHealth.requestTest('down'); step(); for (let i = 0; i < 3; i++) { session.playerHealth.requestTest('hit'); step(); } };
  return { world, session, movement, body, collider, clearInput, step, eliminate, cleanup: () => { detach(); movement.dispose(); session.rescue.dispose(); world.free(); } };
}
test.each(PRIMARY_WEAPON_IDS)('%s respawn preserves equip/settings/world/targets but restores all ammo, clears inertia/flight velocity and accepts only fresh fire', primary => {
  const f = fixture(primary);
  try {
    const first = f.session.loadout.step(fire)!; f.session.playerHealth.step(); f.session.playerHealth.onAcceptedFire(first.sequence);
    f.session.loadout.select(2); const second = f.session.loadout.step(fire)!; f.session.playerHealth.onAcceptedFire(second.sequence);
    f.session.range.entries[0].target.receiveHit({ sequence: 1, tick: 0 }, 20);
    for (let i = 0; i < 10; i++) { f.movement.step(f.body, f.collider, { forward: true, backward: false, left: false, right: false }); f.world.step(); }
    f.session.recoil.kick(1); const objects = [f.world.bodies.len(), f.world.colliders.len()]; f.eliminate(); const deadPosition = f.body.translation();
    for (let i = 0; i < 299; i++) expect(f.step()).toBe(false);
    expect(f.session.playerHealth.getSnapshot()).toMatchObject({ status: 'eliminated', respawnSecondsRemaining: 1, lifeId: 1 }); expect(f.body.translation()).toEqual(deadPosition);
    expect(f.step()).toBe(true); expect(f.session.playerHealth.getSnapshot()).toMatchObject({ status: 'normal', lifeId: 2, revision: 4, hp: 100, protected: true });
    for (const axis of ['x', 'y', 'z'] as const) expect(f.body.translation()[axis]).toBeCloseTo(WHITEBOX_SPAWNS.points[0].position[axis], 5); expect(f.clearInput).toHaveBeenCalledTimes(1);
    expect(f.session.loadout.getSnapshot()).toMatchObject({ primary, active: 'bubble', rescuing: false, scoped: false, progress: null, cooldownProgress: null });
    for (const id of [primary, 'bubble'] as const) expect(f.session.loadout.getWeaponAmmo(id)).toMatchObject({ magazine: WEAPON_CONFIGS[id].magazineSize, reserve: WEAPON_CONFIGS[id].reserveAmmo, reloading: false, shotsFired: 0 });
    expect(f.session.rescue.getSnapshot()).toMatchObject({ mode: 'off', channel: null, ally: null }); expect(f.session.recoil.getState()).toEqual({ riseAngle: 0, pulseAngle: 0 });
    const result = f.movement.step(f.body, f.collider, { forward: false, backward: false, left: false, right: false })!;
    expect(Math.hypot(result.desired.x, result.desired.z)).toBe(0); expect(result.desired.y).toBeCloseTo(-20 / 3600); expect(result.jumped).toBe(false);
    f.world.step(); expect(f.session.range.entries[0].target.getSnapshot().hp).toBe(80); expect([f.world.bodies.len(), f.world.colliders.len()]).toEqual(objects);
    expect(f.session.respawn.getRevision()).toBe(1); expect(f.step()).toBe(false); expect(f.clearInput).toHaveBeenCalledTimes(1);
    const fresh = f.session.loadout.step(fire)!; expect(fresh.sequence).toBeGreaterThan(second.sequence); expect(f.session.playerHealth.onAcceptedFire(fresh.sequence)).toBe(true);
    expect(f.session.playerHealth.canCauseControl()).toBe(true);
  } finally { f.cleanup(); }
});
test('blocked map fallback cannot teleport/heal/refill, then legal geometry retries without another five-second delay', () => {
  const f = fixture();
  try {
    f.session.loadout.step(fire); f.eliminate();
    const blockers = WHITEBOX_SPAWNS.points.filter(p => p.team === 'red').map(p => f.world.createCollider(RAPIER.ColliderDesc.cuboid(.5, 1, .5).setTranslation(p.position.x, p.position.y, p.position.z).setCollisionGroups(COLLISION_GROUPS.map)));
    f.world.step(); const position = f.body.translation(); for (let i = 0; i < 305; i++) expect(f.step()).toBe(false);
    expect(f.session.playerHealth.getSnapshot()).toMatchObject({ status: 'respawning', hp: 0, lifeId: 1 }); expect(f.body.translation()).toEqual(position);
    expect(f.session.loadout.getWeaponAmmo('sniper').magazine).toBe(4); expect(f.clearInput).not.toHaveBeenCalled();
    for (const blocker of blockers) f.world.removeCollider(blocker, false); f.world.step(); expect(f.step()).toBe(true);
    expect(f.session.playerHealth.getSnapshot()).toMatchObject({ status: 'normal', hp: 100, lifeId: 2 }); expect(f.session.loadout.getWeaponAmmo('sniper').magazine).toBe(5);
  } finally { f.cleanup(); }
});
test('application exception remains non-playable without moving body or filling ammo; next tick can retry', () => {
  const f = fixture();
  try {
    f.session.loadout.step(fire); f.eliminate(); for (let i = 0; i < 299; i++) f.step(); f.session.playerHealth.step();
    const position = f.body.translation();
    expect(() => f.session.respawn.step(f.world, f.body, f.movement, () => { throw new Error('Input cleanup unavailable'); })).toThrow('Input cleanup unavailable');
    expect(f.session.playerHealth.getSnapshot()).toMatchObject({ status: 'respawning', hp: 0, lifeId: 1 }); expect(f.body.translation()).toEqual(position); expect(f.session.loadout.getWeaponAmmo('sniper').magazine).toBe(4);
    expect(f.step()).toBe(true); expect(f.session.playerHealth.getSnapshot().lifeId).toBe(2);
  } finally { f.cleanup(); }
});
test('spawn protection lasts120 actual health steps, ignores queued damage, and consumed damage does not replay at expiry', () => {
  const f = fixture();
  try {
    f.eliminate(); for (let i = 0; i < 300; i++) f.step();
    for (let i = 0; i < 119; i++) { f.session.playerHealth.requestTest('hit'); f.step(); }
    expect(f.session.playerHealth.getSnapshot()).toMatchObject({ hp: 100, protected: true }); f.session.playerHealth.requestTest('hit'); f.step();
    expect(f.session.playerHealth.getSnapshot()).toMatchObject({ hp: 80, protected: false, lifeId: 2 });
  } finally { f.cleanup(); }
});
