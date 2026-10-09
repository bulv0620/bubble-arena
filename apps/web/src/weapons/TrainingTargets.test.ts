import { afterEach, beforeAll, expect, test, vi } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { COLLISION_GROUPS, TRAINING_TARGET_CONFIG } from '@bubble-arena/shared';
import { TrainingTargets } from './TrainingTargets';
import { LocalTrainingTarget } from './LocalTrainingTarget';
import { LocalRifle } from './LocalRifle';
import { queryMuzzleRay } from './muzzleRay';

let world: RAPIER.World;
beforeAll(async () => { await RAPIER.init(); });
afterEach(() => world?.free());
const anchor = { x: 0, y: 1, z: 0 }, muzzle = { x: 0, y: 1, z: -0.7 };
const ray = { origin: { x: 0, y: 1, z: 2 }, direction: { x: 0, y: 0, z: -1 }, range: 70 };
function setup() { world = new RAPIER.World({ x: 0, y: 0, z: 0 }); }
function dummy(z: number, registry: TrainingTargets, target = new LocalTrainingTarget()) {
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, 1, z));
  const collider = world.createCollider(RAPIER.ColliderDesc.capsule(TRAINING_TARGET_CONFIG.capsuleHalfHeight, TRAINING_TARGET_CONFIG.radius)
    .setSensor(true).setCollisionGroups(COLLISION_GROUPS.trainingTarget), body);
  const detach = registry.register(collider.handle, target); return { target, collider, body, detach };
}
function wall(z: number) { world.createCollider(RAPIER.ColliderDesc.cuboid(2, 2, 0.05).setTranslation(0, 1, z).setCollisionGroups(COLLISION_GROUPS.map)); }
test('nearest visible sensor is aim target and actual shot invokes independent hit interface once', () => {
  setup(); const registry = new TrainingTargets(), near = dummy(-3, registry); dummy(-6, registry); world.step();
  const spy = vi.spyOn(near.target, 'receiveHit'), listener = vi.fn(), un = near.target.subscribe(listener);
  const aim = registry.aim(world, ray)!; expect(aim.colliderHandle).toBe(near.collider.handle);
  const actual = queryMuzzleRay(world, anchor, muzzle, aim)!;
  expect(registry.receiveShot(world, { tick: 0, sequence: 1 }, actual)).toBe(true);
  expect(registry.receiveShot(world, { tick: 0, sequence: 1 }, actual)).toBe(false);
  expect(spy).toHaveBeenCalledTimes(1); expect(listener).toHaveBeenCalledTimes(1);
  expect(near.target.getSnapshot()).toMatchObject({ hp: 100, hitCount: 1 });
  un(); registry.receiveShot(world, { tick: 8, sequence: 2 }, actual); expect(listener).toHaveBeenCalledTimes(1);
});
test('wall in front of target prevents aim selection and receiveHit, including muzzle guard', () => {
  setup(); const registry = new TrainingTargets(), entry = dummy(-5, registry), spy = vi.spyOn(entry.target, 'receiveHit'); wall(-2); world.step();
  const aim = registry.aim(world, ray)!; expect(aim.colliderHandle).not.toBe(entry.collider.handle);
  const actual = queryMuzzleRay(world, anchor, muzzle, aim)!;
  expect(registry.receiveShot(world, { tick: 0, sequence: 1 }, actual)).toBe(false);
  wall(-0.4); world.step(); const blocked = queryMuzzleRay(world, anchor, muzzle, aim)!;
  expect(blocked.status).toBe('blocked-muzzle'); expect(registry.receiveShot(world, { tick: 8, sequence: 2 }, blocked)).toBe(false);
  expect(spy).not.toHaveBeenCalled();
});
test('miss, absent/invalid results, out-of-range and unregistered colliders never call receiver', () => {
  setup(); const registry = new TrainingTargets(), entry = dummy(-80, registry), spy = vi.spyOn(entry.target, 'receiveHit'); world.step();
  const aim = registry.aim(world, ray)!; expect(aim.status).toBe('clear');
  expect(registry.receiveShot(world, { tick: 0, sequence: 1 }, queryMuzzleRay(world, anchor, muzzle, aim))).toBe(false);
  expect(registry.receiveShot(world, { tick: 8, sequence: 2 }, null)).toBe(false);
  const near = dummy(-3, registry); near.detach(); world.step();
  expect(registry.aim(world, ray)?.status).toBe('clear'); expect(spy).not.toHaveBeenCalled();
});
test('registration cleanup is idempotent, stale cleanup does not remove replacement; scene reset isolates hits', () => {
  setup(); const registry = new TrainingTargets(), entry = dummy(-3, registry); world.step();
  expect(() => registry.register(entry.collider.handle, entry.target)).toThrow(TypeError);
  entry.detach(); const replacement = new LocalTrainingTarget(), detachNew = registry.register(entry.collider.handle, replacement); entry.detach();
  const aim = registry.aim(world, ray)!; registry.receiveShot(world, { tick: 0, sequence: 1 }, queryMuzzleRay(world, anchor, muzzle, aim));
  expect(entry.target.getSnapshot().hitCount).toBe(0); expect(replacement.getSnapshot().hitCount).toBe(1);
  detachNew(); expect(registry.aim(world, ray)?.status).toBe('clear');
  expect(new LocalTrainingTarget().getSnapshot().hitCount).toBe(0);
  expect(() => registry.register(NaN, replacement)).toThrow(TypeError);
});
test('training sensor does not participate in player movement or map camera queries', () => {
  setup(); const registry = new TrainingTargets(), entry = dummy(-3, registry); world.step();
  const hit = world.castRay(new RAPIER.Ray(ray.origin, ray.direction), 70, true, undefined, COLLISION_GROUPS.player);
  expect(hit).toBeNull(); expect(entry.collider.isSensor()).toBe(true);
  const before = [world.bodies.len(), world.colliders.len()]; for (let i = 0; i < 20; i++) registry.aim(world, ray);
  expect([world.bodies.len(), world.colliders.len()]).toEqual(before);
});
test('accepted rifle tick dispatches hits; cooldown/reload do not emit, stale missed event cannot later hit', () => {
  setup(); const registry = new TrainingTargets(), entry = dummy(-3, registry), rifle = new LocalRifle(); world.step();
  const aim = registry.aim(world, ray)!, actual = queryMuzzleRay(world, anchor, muzzle, aim)!;
  for (let i = 0; i < 60; i++) { const shot = rifle.step({ held: true, pressed: false }); if (shot) registry.receiveShot(world, shot, actual); }
  expect(entry.target.getSnapshot().hitCount).toBe(8); expect(rifle.getSnapshot().magazine).toBe(22);
  rifle.step({ held: true, pressed: false }, true);
  for (let i = 0; i < 120; i++) expect(rifle.step({ held: true, pressed: false })).toBeNull();
  registry.receiveShot(world, { tick: 300, sequence: 100 }, null);
  expect(registry.receiveShot(world, { tick: 300, sequence: 100 }, actual)).toBe(false);
  expect(() => registry.receiveShot(world, { tick: -1, sequence: 101 }, actual)).toThrow(TypeError);
});
test('coincident target and wall surfaces keep map priority instead of dispatching through float rounding', () => {
  setup(); const registry = new TrainingTargets(), entry = dummy(-3, registry); wall(-2.7); world.step();
  const aim = registry.aim(world, ray)!;
  expect(aim.colliderHandle).not.toBe(entry.collider.handle);
  expect(registry.receiveShot(world, { tick: 0, sequence: 1 }, queryMuzzleRay(world, anchor, muzzle, aim))).toBe(false);
  expect(entry.target.getSnapshot().hitCount).toBe(0);
});
