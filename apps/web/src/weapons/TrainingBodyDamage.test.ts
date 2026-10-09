import { beforeAll, expect, test, vi } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { BLOCK_AVATAR_CONFIG as shape, COLLISION_GROUPS, WEAPON_DAMAGE_PROFILES } from '@bubble-arena/shared';
import { calculateWeaponDamage } from '@bubble-arena/game-core';
import { TrainingTargets } from './TrainingTargets';
import { LocalTrainingTarget } from './LocalTrainingTarget';
import { queryMuzzleRay } from './muzzleRay';

beforeAll(async () => { await RAPIER.init(); });
function dummy(world: RAPIER.World, registry: TrainingTargets, z: number) {
  const target = new LocalTrainingTarget(), body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, 1, z));
  const head = world.createCollider(RAPIER.ColliderDesc.ball(shape.headRadius).setTranslation(0, shape.headY, 0)
    .setSensor(true).setCollisionGroups(COLLISION_GROUPS.trainingTarget), body);
  const torso = world.createCollider(RAPIER.ColliderDesc.capsule(shape.bodyHalfHeight, shape.bodyRadius).setTranslation(0, shape.bodyY, 0)
    .setSensor(true).setCollisionGroups(COLLISION_GROUPS.trainingTarget), body);
  const releases = [registry.register(head.handle, target, 'head'), registry.register(torso.handle, target, 'body')];
  return { target, head, torso, release: () => releases.forEach(release => release()) };
}
function shotRay(world: RAPIER.World, registry: TrainingTargets, y: number, x = 0) {
  const origin = { x, y, z: 0 }, muzzle = { ...origin, z: -.7 };
  const aim = registry.aim(world, { origin, direction: { x: 0, y: 0, z: -1 }, range: 70 })!;
  return { aim, result: queryMuzzleRay(world, origin, muzzle, aim)! };
}
test('a ray passing through both volumes applies only the nearest head hit once', () => {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  try {
    const registry = new TrainingTargets(), entry = dummy(world, registry, -7), receive = vi.spyOn(entry.target, 'receiveHit'); world.step();
    const origin = { x: 0, y: 3, z: -7 };
    const aim = registry.aim(world, { origin, direction: { x: 0, y: -1, z: 0 }, range: 70 })!;
    expect(aim.colliderHandle).toBe(entry.head.handle);
    const actual = queryMuzzleRay(world, origin, { ...origin, y: 2.8 }, aim)!;
    expect(registry.receiveShot(world, { tick: 0, sequence: 1 }, actual)).toBe(true);
    expect(receive).toHaveBeenCalledTimes(1);
    expect(entry.target.getSnapshot()).toMatchObject({ hp: 60, lastDamage: 40, hitCount: 1 });
  } finally { world.free(); }
});
test('visual-matched real head/body sensors yield 40/20 and actual damage floats; one shot cannot damage both', () => {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  try {
    const registry = new TrainingTargets(), entry = dummy(world, registry, -7), receive = vi.spyOn(entry.target, 'receiveHit'); world.step();
    const head = shotRay(world, registry, 1 + shape.headY), body = shotRay(world, registry, 1 + shape.bodyY);
    expect(head.aim.colliderHandle).toBe(entry.head.handle); expect(body.aim.colliderHandle).toBe(entry.torso.handle);
    expect(registry.receiveShot(world, { tick: 0, sequence: 1 }, head.result)).toBe(true);
    expect(entry.target.getSnapshot()).toMatchObject({ hp: 60, lastDamage: 40 });
    expect(registry.receiveShot(world, { tick: 0, sequence: 1 }, body.result)).toBe(false);
    expect(registry.receiveShot(world, { tick: 8, sequence: 2 }, body.result)).toBe(true);
    expect(entry.target.getSnapshot()).toMatchObject({ hp: 40, lastDamage: 20, hitCount: 2 });
    expect(entry.target.damageNumbers.getSnapshot().map(n => n.damage)).toEqual([40, 20]);
    expect(receive).toHaveBeenCalledTimes(2);
    registry.receiveShot(world, { tick: 16, sequence: 3 }, head.result);
    for (let i = 0; i < 120; i++) entry.target.step();
    expect(entry.target.getSnapshot().hp).toBe(100); expect(entry.target.damageNumbers.getSnapshot()).toEqual([]);
    entry.release(); entry.release(); expect(shotRay(world, registry, 1 + shape.headY).aim.status).toBe('clear');
  } finally { world.free(); }
});
test.each([-30, -60, -70.5])('distance damage uses muzzle impact distance for target z=%s, not camera distance or backdrop', z => {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  try {
    const registry = new TrainingTargets(), entry = dummy(world, registry, z); world.step();
    for (const [region, offset] of [['head', shape.headY], ['body', shape.bodyY]] as const) {
      const { result } = shotRay(world, registry, 1 + offset);
      const applied = vi.spyOn(entry.target, 'receiveHit');
      const sequence = region === 'head' ? 1 : 2;
      expect(registry.receiveShot(world, { tick: sequence * 8, sequence }, result)).toBe(true);
      const radius = region === 'head' ? shape.headRadius : shape.bodyRadius;
      const expectedDistance = -z - .7 - radius;
      expect(applied).toHaveBeenLastCalledWith({ tick: sequence * 8, sequence }, calculateWeaponDamage(20, WEAPON_DAMAGE_PROFILES.rifle, region, expectedDistance));
      applied.mockRestore();
    }
  } finally { world.free(); }
});
test('targets beyond actual rifle range cannot receive either head or body damage', () => {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  try {
    const registry = new TrainingTargets(), entry = dummy(world, registry, -72); world.step();
    for (const [sequence, offset] of [[1, shape.headY], [2, shape.bodyY]])
      expect(registry.receiveShot(world, { tick: sequence * 8, sequence }, shotRay(world, registry, 1 + offset).result)).toBe(false);
    expect(entry.target.getSnapshot().hp).toBe(100);
  } finally { world.free(); }
});
test('head perimeter matches sphere rather than broad capsule; wall and muzzle guard still prevent damage', () => {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  try {
    const registry = new TrainingTargets(), entry = dummy(world, registry, -7); world.step();
    expect(shotRay(world, registry, 1 + shape.headY, shape.headRadius - .01).aim.colliderHandle).toBe(entry.head.handle);
    expect(shotRay(world, registry, 1 + shape.headY, shape.headRadius + .01).aim.status).toBe('clear');
    expect(shotRay(world, registry, 1 + shape.bodyY, shape.bodyRadius + .01).aim.status).toBe('clear');
    const wall = world.createCollider(RAPIER.ColliderDesc.cuboid(2, 2, .05).setTranslation(0, 1, -2).setCollisionGroups(COLLISION_GROUPS.map)); world.step();
    const blocked = shotRay(world, registry, 1 + shape.headY);
    expect(blocked.aim.colliderHandle).toBe(wall.handle);
    expect(registry.receiveShot(world, { tick: 0, sequence: 1 }, blocked.result)).toBe(false);
    world.createCollider(RAPIER.ColliderDesc.cuboid(2, 2, .05).setTranslation(0, 1, -.4).setCollisionGroups(COLLISION_GROUPS.map)); world.step();
    const guard = shotRay(world, registry, 1 + shape.bodyY);
    expect(guard.result.status).toBe('blocked-muzzle');
    expect(registry.receiveShot(world, { tick: 8, sequence: 2 }, guard.result)).toBe(false);
    expect(entry.target.getSnapshot().hp).toBe(100);
    expect(world.castRay(new RAPIER.Ray({ x: 0, y: 1 + shape.headY, z: -3 }, { x: 0, y: 0, z: -1 }), 10, true, undefined, COLLISION_GROUPS.player)).toBeNull();
    expect(() => registry.register(12345, entry.target, 'leg' as 'head')).toThrow(TypeError);
  } finally { world.free(); }
});
