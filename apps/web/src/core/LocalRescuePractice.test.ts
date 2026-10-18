import { beforeAll, expect, test } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { COLLISION_GROUPS } from '@bubble-arena/shared';
import { createTrainingSession } from './trainingSession';
import { RapierMovement } from '../player/RapierMovement';
import type { RescueInputState } from '../input/RescueInput';
const idle: RescueInputState = { held: false, active: true, move: false, jump: false, fire: false, reload: false, weaponSwitch: false, aim: false };
const stationary = { forward: false, backward: false, left: false, right: false };
const at = { x: 10.88, y: .91, z: 0 };
beforeAll(async () => { await RAPIER.init(); });
test.each(['stationary', 'crawl-away', 'injury'] as const)('%s practice uses real map queries/fixed ticks; stationary heals while interruptions release gates', mode => {
  const world = new RAPIER.World({ x: 0, y: -20, z: 0 }), session = createTrainingSession('sniper');
  try {
    world.createCollider(RAPIER.ColliderDesc.cuboid(40, .5, 40).setTranslation(0, -.5, 0).setCollisionGroups(COLLISION_GROUPS.map)); world.step();
    session.rescue.configure(mode); session.rescue.step(world, at, true, idle);
    for (let tick = 0; tick < 120; tick++) {
      session.playerHealth.step(); session.rescue.step(world, at, true, { ...idle, held: true });
      if (mode === 'stationary' && tick < 119) {
        expect(session.loadout.canOperate()).toBe(false); expect(session.loadout.getSpeed()).toBe(0);
        expect(session.loadout.step({ held: true, pressed: true }, true)).toBeNull(); expect(session.loadout.select(4)).toBe(false);
      }
    }
    if (mode === 'stationary') { expect(session.rescue.getSnapshot().channel).toBeNull(); expect(session.rescue.getSnapshot().allyHealth).toMatchObject({ status: 'normal', hp: 50, downedHp: 0, revision: 2, protected: true }); }
    else { expect(session.rescue.getSnapshot().channel).toBeNull(); expect(session.loadout.canOperate()).toBe(true); }
    if (mode === 'injury') { expect(session.playerHealth.getSnapshot().hp).toBe(80); expect(session.rescue.getSnapshot().message).toContain('受到伤害'); }
    if (mode === 'crawl-away') expect(session.rescue.getSnapshot().message).toContain('移出2米');
    expect(session.rescue.getAllyHp()).toBe(mode === 'stationary' ? 50 : 300); expect(session.loadout.getSnapshot().ammo.magazine).toBe(5);
    session.rescue.step(world, at, true, idle); expect(session.loadout.getSpeed()).toBeCloseTo(4.8); expect(session.loadout.canOperate()).toBe(true);
    session.rescue.dispose(); session.rescue.dispose();
  } finally { world.free(); }
});
test('same Rapier controller stops existing inertia immediately during rescue; queue/reload canceled, release restores weight speed', () => {
  const world = new RAPIER.World({ x: 0, y: -20, z: 0 }), session = createTrainingSession(), adapter = new RapierMovement(world);
  try {
    world.createCollider(RAPIER.ColliderDesc.cuboid(40, .5, 40).setTranslation(0, -.5, 0).setCollisionGroups(COLLISION_GROUPS.map));
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(at.x, .92, 0));
    const collider = world.createCollider(RAPIER.ColliderDesc.capsule(.55, .35).setCollisionGroups(COLLISION_GROUPS.player), body); world.step();
    for (let tick = 0; tick < 60; tick++) { adapter.step(body, collider, { ...stationary, right: true }); world.step(); }
    session.loadout.step({ held: true, pressed: true }); session.loadout.step({ held: false, pressed: false }, true);
    expect(session.loadout.getSnapshot().ammo.reloading).toBe(true);
    session.rescue.configure('stationary'); session.rescue.step(world, body.translation(), true, { ...idle, held: true });
    expect(session.loadout.getSnapshot().ammo).toMatchObject({ magazine: 29, reloading: false });
    const bodies = world.bodies.len(), colliders = world.colliders.len();
    const result = adapter.step(body, collider, stationary, false, 0, session.loadout.getSpeed() / 5, 0)!; world.step();
    expect(Math.hypot(result.desired.x, result.desired.z)).toBe(0); expect(result.jumped).toBe(false);
    expect(world.bodies.len()).toBe(bodies); expect(world.colliders.len()).toBe(colliders);
    session.rescue.cancel(); expect(session.loadout.getSpeed()).toBe(6);
    expect(adapter.step(body, collider, { ...stationary, right: true })!.desired.x).toBeGreaterThan(0);
  } finally { session.rescue.dispose(); adapter.dispose(); world.free(); }
});
test('reset/disable/unsubscribe discard pending fixture and locks; normal health damage and downed policy still apply', () => {
  const world = new RAPIER.World({ x: 0, y: -20, z: 0 }), session = createTrainingSession();
  try {
    world.step(); session.rescue.configure('stationary'); session.rescue.step(world, at, true, { ...idle, held: true });
    session.playerHealth.requestTest('down'); session.playerHealth.step(); session.loadout.setLifeStatus('downed');
    session.rescue.step(world, at, true, { ...idle, held: true });
    expect(session.rescue.getSnapshot().channel).toBeNull(); expect(session.loadout.getSpeed()).toBe(1);
    let calls = 0; const unsub = session.rescue.subscribe(() => { calls++; }); unsub(); unsub();
    session.rescue.configure('off'); session.rescue.step(world, at, true, idle); expect(session.rescue.getSnapshot().ally).toBeNull(); expect(calls).toBe(0);
    session.rescue.configure('stationary'); session.rescue.dispose(); session.rescue.step(world, at, true, idle); expect(session.rescue.getSnapshot().mode).toBe('off');
    const fresh = createTrainingSession(); expect(fresh.rescue.getSnapshot().mode).toBe('off'); expect(fresh.loadout.canOperate()).toBe(true);
  } finally { session.rescue.dispose(); world.free(); }
});

test('two distinct real fixture rescues count twice, interruptions and repeated idle completions never add stats', () => {
  const world = new RAPIER.World({ x: 0, y: -20, z: 0 }), s = createTrainingSession();
  try {
    world.step();
    const step = (held = false) => { s.playerHealth.step(); return s.rescue.step(world, at, true, { ...idle, held }); };
    for (let run = 0; run < 2; run++) {
      s.rescue.configure('stationary'); step();
      for (let tick = 0; tick < 120; tick++) step(true);
      expect(s.score.getSnapshot().players.find(p => p.playerId === 'training-player')?.rescues).toBe(run + 1);
      for (let tick = 0; tick < 30; tick++) step();
    }
    s.rescue.configure('stationary'); step(); for (let tick = 0; tick < 30; tick++) step(true); step();
    expect(s.score.getSnapshot().players.find(p => p.playerId === 'training-player')?.rescues).toBe(2);
    expect(s.score.getSnapshot().teams).toEqual({ red: 0, blue: 0 });
  } finally { s.rescue.dispose(); world.free(); }
});
