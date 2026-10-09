import { beforeAll, expect, test, vi } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { COLLISION_GROUPS, BLOCK_AVATAR_CONFIG as shape, WHITEBOX_COLLISION, TRAINING_RANGE_CONFIG } from '@bubble-arena/shared';
import { LocalTrainingRange } from './LocalTrainingRange';
import { TrainingTargets } from './TrainingTargets';
import { queryMuzzleRay } from './muzzleRay';
beforeAll(async () => { await RAPIER.init(); });
test('three configured fixtures receive independent damage through real map queries, preserving clear firing lanes', () => {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 }), range = new LocalTrainingRange(), registry = new TrainingTargets();
  const releases: (() => void)[] = [];
  try {
    for (const solid of WHITEBOX_COLLISION.solids) {
      const [x, y, z] = solid.position;
      const collider = RAPIER.ColliderDesc.cuboid(solid.size[0] / 2, solid.size[1] / 2, solid.size[2] / 2)
        .setTranslation(x, y, z).setRotation({ x: 0, y: 0, z: Math.sin(solid.rotationZ / 2), w: Math.cos(solid.rotationZ / 2) })
        .setCollisionGroups(COLLISION_GROUPS.map);
      world.createCollider(collider);
    }
    const handles = range.entries.map(entry => {
      const [x, y, z] = entry.position;
      const head = world.createCollider(RAPIER.ColliderDesc.ball(shape.headRadius).setTranslation(x, y + shape.headY, z)
        .setSensor(true).setCollisionGroups(COLLISION_GROUPS.trainingTarget));
      const sensor = world.createCollider(RAPIER.ColliderDesc.capsule(shape.bodyHalfHeight, shape.bodyRadius)
        .setTranslation(x, y + shape.bodyY, z).setSensor(true).setCollisionGroups(COLLISION_GROUPS.trainingTarget));
      releases.push(registry.register(head.handle, entry.target, 'head'), registry.register(sensor.handle, entry.target, 'body')); return sensor.handle;
    });
    world.step();
    const initial = range.getSnapshot(), notify = vi.fn(), unsubscribe = range.subscribe(notify);
    for (let i = 0; i < 3; i++) {
      const x = range.entries[i].position[0], origin = { x, y: .8, z: 0 };
      const aim = registry.aim(world, { origin, direction: { x: 0, y: 0, z: -1 }, range: 70 })!;
      expect(aim.colliderHandle).toBe(handles[i]);
      const result = queryMuzzleRay(world, origin, { ...origin, z: -0.67 }, aim);
      expect(registry.receiveShot(world, { tick: i * 8, sequence: i + 1 }, result)).toBe(true);
      expect(range.getSnapshot().targets.map(s => s.hp)).toEqual([0, 1, 2].map(index => index <= i ? 80 : 100));
    }
    expect(range.getSnapshot()).toBe(range.getSnapshot()); expect(initial.targets.every(s => s.hp === 100)).toBe(true);
    expect(range.getSnapshot().hitCount).toBe(3); expect(notify).toHaveBeenCalledTimes(3);
    unsubscribe(); unsubscribe(); range.entries[0].target.receiveHit({ tick: 100, sequence: 10 }); expect(notify).toHaveBeenCalledTimes(3);
    expect(new LocalTrainingRange().getSnapshot().targets.every(s => s.hp === 100)).toBe(true);
    const spawn = { x: TRAINING_RANGE_CONFIG.playerSpawnXZ[0], y: 0.9, z: TRAINING_RANGE_CONFIG.playerSpawnXZ[1] };
    expect(world.intersectionWithShape(spawn, { x: 0, y: 0, z: 0, w: 1 }, new RAPIER.Capsule(0.55, 0.35), undefined, COLLISION_GROUPS.player)).toBeNull();
  } finally { releases.forEach(release => release()); world.free(); }
});
