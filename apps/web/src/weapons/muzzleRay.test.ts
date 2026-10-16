import { afterEach, beforeAll, expect, test } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { Group, Vector3 } from 'three';
import { COLLISION_GROUPS } from '@bubble-arena/shared';
import { queryMuzzleRay } from './muzzleRay';
import { queryScreenAimTarget, type ScreenAimTarget } from './screenAimRay';
import { rifleMuzzlePosition, RIFLE_PLACEHOLDER_POSE } from './riflePose';
import { LocalRifle } from './LocalRifle';

let world: RAPIER.World;
beforeAll(async () => { await RAPIER.init(); });
afterEach(() => world?.free());
const anchor = { x: 0, y: 1, z: 0 }, muzzle = { x: 0, y: 1, z: -0.7 };
function setup() { world = new RAPIER.World({ x: 0, y: 0, z: 0 }); }
function wall(z: number, width = 3) {
  return world.createCollider(RAPIER.ColliderDesc.cuboid(width, 2, 0.05).setTranslation(0, 1, z).setCollisionGroups(COLLISION_GROUPS.map));
}
function target(point = { x: 0, y: 1, z: -10 }): ScreenAimTarget {
  return { origin: { x: 2, y: 1, z: 0 }, direction: { x: 0, y: 0, z: -1 }, range: 70,
    status: 'clear', point, distance: 70, colliderHandle: null };
}
test('camera sees around cover but muzzle ray stops at near wall instead of following camera hit', () => {
  setup(); const blocker = wall(-2, 0.3); world.step();
  const aim = queryScreenAimTarget(world, { origin: { x: 2, y: 1, z: 0 }, direction: { x: -2, y: 0, z: -10 }, range: Math.hypot(2, 10) })!;
  expect(aim.status).toBe('clear');
  const actual = queryMuzzleRay(world, anchor, muzzle, aim)!;
  expect(actual.status).toBe('hit'); expect(actual.colliderHandle).toBe(blocker.handle);
  expect(actual.point.z).toBeCloseTo(-1.95, 5); expect(actual.distance).toBeCloseTo(1.25, 5);
});
test.each([-0.7, -0.4])('muzzle inside or beyond thin wall z=%s is blocked by anchor-to-muzzle guard', z => {
  setup(); const blocker = wall(z); world.step();
  const actual = queryMuzzleRay(world, anchor, muzzle, target())!;
  expect(actual.status).toBe('blocked-muzzle'); expect(actual.colliderHandle).toBe(blocker.handle);
  expect(actual.point.z).toBeCloseTo(z + 0.05, 5); expect(actual.origin).toEqual(anchor);
});
test('anchor inside solid blocks immediately rather than escaping through it', () => {
  setup(); wall(0); world.step();
  expect(queryMuzzleRay(world, anchor, muzzle, target())).toMatchObject({ status: 'blocked-muzzle', distance: 0, point: anchor });
});
test('clear path uses physical muzzle origin and 70m range; nearer wall wins over farther wall', () => {
  setup(); const sample = queryMuzzleRay(world, anchor, muzzle, target())!;
  expect(sample).toMatchObject({ status: 'clear', origin: muzzle, distance: 70, point: { x: 0, y: 1, z: -70.7 } });
  wall(-75); world.step(); expect(queryMuzzleRay(world, anchor, muzzle, target())?.status).toBe('clear');
  wall(-5); const near = wall(-3); world.step();
  expect(queryMuzzleRay(world, anchor, muzzle, target())?.colliderHandle).toBe(near.handle);
});
test('capsules, dynamic bodies, sensors and unrelated groups cannot obstruct or become actual map hit', () => {
  setup();
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 1, 0));
  world.createCollider(RAPIER.ColliderDesc.capsule(0.55, 0.35).setCollisionGroups(COLLISION_GROUPS.player), body);
  const dynamic = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 1, -2));
  world.createCollider(RAPIER.ColliderDesc.cuboid(1, 1, 0.1).setCollisionGroups(COLLISION_GROUPS.map), dynamic);
  wall(-0.4).setSensor(true); wall(-3).setCollisionGroups(COLLISION_GROUPS.testCube); world.step();
  expect(queryMuzzleRay(world, anchor, muzzle, target())?.status).toBe('clear');
});
test('computed muzzle matches rendered socket and facing transform at different positions/yaws', () => {
  setup();
  const { socket, front } = RIFLE_PLACEHOLDER_POSE;
  for (const yaw of [0, Math.PI / 2, -2.3]) for (const center of [anchor, { x: 4, y: 3, z: -6 }]) {
    const visual = new Group(), weapon = new Group(), tip = new Group();
    visual.position.set(center.x, center.y, center.z); visual.rotation.y = yaw;
    weapon.position.set(socket.x, socket.y, socket.z); weapon.rotation.y = Math.PI;
    tip.position.set(0, front.y, front.z + front.depth / 2); visual.add(weapon); weapon.add(tip);
    const expected = tip.getWorldPosition(new Vector3()), actual = rifleMuzzlePosition(center, yaw)!;
    expect(actual.x).toBeCloseTo(expected.x, 12); expect(actual.y).toBeCloseTo(expected.y, 12); expect(actual.z).toBeCloseTo(expected.z, 12);
  }
});
test('invalid/coincident positions reject; results freeze and repeated queries do not mutate world or input', () => {
  setup(); wall(-2); world.step(); const aim = target(), before = JSON.stringify(aim), count = [world.bodies.len(), world.colliders.len()];
  expect(queryMuzzleRay(world, anchor, muzzle, target(muzzle))).toBeNull();
  expect(queryMuzzleRay(world, anchor, anchor, aim)).toBeNull();
  expect(queryMuzzleRay(world, { ...anchor, x: NaN }, muzzle, aim)).toBeNull();
  expect(queryMuzzleRay(world, anchor, muzzle, aim, Infinity)).toBeNull();
  expect(queryMuzzleRay(world, anchor, muzzle, null as unknown as ScreenAimTarget)).toBeNull();
  expect(rifleMuzzlePosition(anchor, NaN)).toBeNull();
  for (let i = 0; i < 20; i++) { const result = queryMuzzleRay(world, anchor, muzzle, aim)!; expect(Object.isFrozen(result)).toBe(true); expect(Object.isFrozen(result.point)).toBe(true); }
  expect(JSON.stringify(aim)).toBe(before); expect([world.bodies.len(), world.colliders.len()]).toEqual(count);
});
test('accepted blocked shot still spends one round; cooldown and reload cannot create extra ray events', () => {
  setup(); wall(-0.4); world.step(); const rifle = new LocalRifle(); let events = 0;
  for (let tick = 0; tick < 60; tick++) {
    const shot = rifle.step({ held: true, pressed: false });
    if (shot) { events++; expect(queryMuzzleRay(world, anchor, muzzle, target())?.status).toBe('blocked-muzzle'); }
  }
  expect(events).toBe(8); expect(rifle.getSnapshot().magazine).toBe(22);
  rifle.step({ held: true, pressed: false }, true);
  for (let i = 0; i < 120; i++) expect(rifle.step({ held: true, pressed: false })).toBeNull();
});

test('scattered direction drives actual map collision, with unchanged close-wall protection', () => {
  setup(); const blocker = wall(-3, 0.02); world.step();
  expect(queryMuzzleRay(world, anchor, muzzle, target())?.status).toBe('hit');
  const scattered = { x: Math.sin(2 * Math.PI / 180), y: 0, z: -Math.cos(2 * Math.PI / 180) };
  const result = queryMuzzleRay(world, anchor, muzzle, target(), 70, scattered)!;
  expect(result.status).toBe('clear'); expect(result.direction.x).toBeCloseTo(scattered.x);
  blocker.setTranslation({ x: 0, y: 1, z: -0.4 }); world.step();
  expect(queryMuzzleRay(world, anchor, muzzle, target(), 70, scattered)?.status).toBe('blocked-muzzle');
  blocker.setTranslation({ x: 0, y: 1, z: -3 }); world.step();
  expect(queryMuzzleRay(world, anchor, muzzle, target(), 70, { x: NaN, y: 0, z: -1 })).toBeNull();
});
test.each(['rifle','shotgun','sniper','bubble'] as const)('%s socket still blocks center-to-muzzle cover, and clears when cover is removed', weapon => {
  setup(); const center={x:0,y:1,z:0}, actual=rifleMuzzlePosition(center,0,weapon)!;
  const blocker=wall(-.3);world.step();expect(queryMuzzleRay(world,center,actual,target())?.status).toBe('blocked-muzzle');
  world.removeCollider(blocker,true);world.step();expect(queryMuzzleRay(world,center,actual,target())?.status).toBe('clear');
});
