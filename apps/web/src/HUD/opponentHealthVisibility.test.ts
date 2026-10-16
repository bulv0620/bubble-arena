import { beforeAll, expect, test } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { Vector3 } from 'three';
import { COLLISION_GROUPS, PLAYER_CONFIG } from '@bubble-arena/shared';
import { isRescueLineClear } from '../player/rescueLineOfSight';
import { isOpponentHealthVisible } from './opponentHealthVisibility';
beforeAll(async () => { await RAPIER.init(); });
test('hides a body fully behind cover even when its overhead label clears the wall; restores from another angle', () => {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  try {
    world.createCollider(RAPIER.ColliderDesc.cuboid(1, .85, .15).setTranslation(0, .85, 3).setCollisionGroups(COLLISION_GROUPS.map)); world.step();
    const eye = new Vector3(0, 1.5, 6), center = new Vector3(0, .92, 0);
    expect(isRescueLineClear(world, { x: 0, y: 1.5, z: 6 }, { x: 0, y: center.y + PLAYER_CONFIG.height / 2 + .38, z: 0 })).toBe(true);
    expect(isOpponentHealthVisible(world, eye, center, 'normal')).toBe(false);
    expect(isOpponentHealthVisible(world, eye, center, 'downed')).toBe(false);
    eye.x = 5; expect(isOpponentHealthVisible(world, eye, center, 'normal')).toBe(true);
    eye.x = 0; expect(isOpponentHealthVisible(world, eye, center, 'normal')).toBe(false);
  } finally { world.free(); }
});
test('shows an exposed head above low cover, ignores sensors/dynamic actors, always hides eliminated and waiting actors', () => {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  try {
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, .92, 0));
    const cover = world.createCollider(RAPIER.ColliderDesc.cuboid(1, .65, .15).setTranslation(0, .65, 3).setCollisionGroups(COLLISION_GROUPS.map)); world.step();
    const eye = new Vector3(0, 1.5, 6), center = body.translation();
    expect(isOpponentHealthVisible(world, eye, center, 'normal')).toBe(true);
    expect(isOpponentHealthVisible(world, eye, center, 'downed')).toBe(true);
    for (const status of ['eliminated', 'respawning'] as const) expect(isOpponentHealthVisible(world, eye, center, status)).toBe(false);
    world.createCollider(RAPIER.ColliderDesc.cuboid(2, 4, .2).setTranslation(0, 2, 4).setSensor(true).setCollisionGroups(COLLISION_GROUPS.map));
    const dynamic = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 2, 5));
    world.createCollider(RAPIER.ColliderDesc.cuboid(2, 4, .2).setCollisionGroups(COLLISION_GROUPS.map), dynamic); world.step();
    expect(isOpponentHealthVisible(world, eye, center, 'normal')).toBe(true);
    world.removeCollider(cover, true); world.step(); expect(isOpponentHealthVisible(world, eye, center, 'normal')).toBe(true);
    expect(isOpponentHealthVisible(world, { ...eye, x: NaN }, center, 'normal')).toBe(false);
  } finally { world.free(); }
});
