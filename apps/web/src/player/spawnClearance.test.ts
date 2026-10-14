import { beforeAll, expect, test } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { WHITEBOX_COLLISION, WHITEBOX_SPAWNS, COLLISION_GROUPS } from '@bubble-arena/shared';
import { isSpawnClear } from './spawnClearance';
beforeAll(async () => { await RAPIER.init(); });
function map() {
  const w = new RAPIER.World({ x: 0, y: -20, z: 0 }), ground = WHITEBOX_COLLISION.ground;
  w.createCollider(RAPIER.ColliderDesc.cuboid(ground.size / 2, ground.thickness / 2, ground.size / 2).setTranslation(0, ground.topY - ground.thickness / 2, 0).setCollisionGroups(COLLISION_GROUPS.map));
  for (const s of WHITEBOX_COLLISION.solids) w.createCollider(RAPIER.ColliderDesc.cuboid(s.size[0] / 2, s.size[1] / 2, s.size[2] / 2).setTranslation(...s.position).setRotation({ x: 0, y: 0, z: Math.sin(s.rotationZ / 2), w: Math.cos(s.rotationZ / 2) }).setCollisionGroups(COLLISION_GROUPS.map));
  w.step(); return w;
}
test('all eight shared spawn capsules are clear and supported in the actual versioned whitebox map', () => {
  const w = map(); try { const bodies = w.bodies.len(), colliders = w.colliders.len(); for (const p of WHITEBOX_SPAWNS.points) expect(isSpawnClear(w, p.position), p.id).toBe(true);
    expect(w.bodies.len()).toBe(bodies); expect(w.colliders.len()).toBe(colliders);
  } finally { w.free(); }
});
test('wall/body-edge, unsupported sky/ground exterior and insufficient headroom are rejected', () => {
  const w = map(); try {
    for (const p of [{ x: 12, y: .92, z: -9 }, { x: 12, y: .92, z: -8.6 }, { x: 12, y: 5, z: 0 }, { x: 42, y: .92, z: 0 }]) expect(isSpawnClear(w, p)).toBe(false);
    w.createCollider(RAPIER.ColliderDesc.cuboid(1, .1, 1).setTranslation(10.88, 1.7, 0).setCollisionGroups(COLLISION_GROUPS.map)); w.step(); expect(isSpawnClear(w, WHITEBOX_SPAWNS.points[0].position)).toBe(false);
  } finally { w.free(); }
});
test('kinematic characters, dynamic bodies and sensors do not block spawn; query creates no world objects', () => {
  const w = map(), p = WHITEBOX_SPAWNS.points[0].position;
  try {
    const person = w.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(p.x, p.y, p.z)); w.createCollider(RAPIER.ColliderDesc.capsule(.55, .35).setCollisionGroups(COLLISION_GROUPS.player), person);
    const dynamic = w.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(p.x, p.y, p.z)); w.createCollider(RAPIER.ColliderDesc.ball(.5).setCollisionGroups(COLLISION_GROUPS.map), dynamic);
    w.createCollider(RAPIER.ColliderDesc.ball(.5).setTranslation(p.x, p.y, p.z).setSensor(true).setCollisionGroups(COLLISION_GROUPS.map)); w.step();
    expect(isSpawnClear(w, p)).toBe(true); const count = w.colliders.len(); for (let i = 0; i < 10; i++) isSpawnClear(w, p); expect(w.colliders.len()).toBe(count);
  } finally { w.free(); }
});
