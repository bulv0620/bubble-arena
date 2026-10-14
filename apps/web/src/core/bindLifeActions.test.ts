import { beforeAll, expect, test } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { COLLISION_GROUPS } from '@bubble-arena/shared';
import { playerActionPolicy } from '@bubble-arena/game-core';
import { KeyboardInput } from '../player/KeyboardInput';
import { RapierMovement } from '../player/RapierMovement';
import { AimInput } from '../input/AimInput';
import { FireInput } from '../weapons/FireInput';
import { ReloadInput } from '../weapons/ReloadInput';
import { WeaponSwitchInput } from '../weapons/WeaponSwitchInput';
import { PointerLockInput } from '../camera/PointerLockInput';
import { createTrainingSession } from './trainingSession';
import { bindLifeActions } from './bindLifeActions';
beforeAll(async () => { await RAPIER.init(); });
const event = (target: EventTarget, type: string, fields = {}) => target.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), fields));
function fixture() {
  const global = new EventTarget(), canvas = new EventTarget(), doc = Object.assign(new EventTarget(), { hidden: false, visibilityState: 'visible' as DocumentVisibilityState, pointerLockElement: null as EventTarget | null });
  doc.pointerLockElement = canvas;
  const keyboard = new KeyboardInput(), aim = new AimInput(), pointer = new PointerLockInput(), fire = new FireInput(pointer, aim), reload = new ReloadInput(), switchInput = new WeaponSwitchInput();
  const session = createTrainingSession('sniper'), enabled = () => session.loadout.canOperate();
  const actions = { keyboard, aim, fire, reload, switchInput, recoil: session.recoil, feedback: session.feedback };
  const detach = [keyboard.attach(global, doc), aim.attach(canvas, global, doc, enabled, () => true, session.loadout.canScope),
    pointer.attach(canvas, global, doc, () => {}, () => {}), fire.attach(canvas, global, doc, enabled), reload.attach(global, doc, enabled), switchInput.attach(global, doc, enabled)];
  event(doc, 'pointerlockchange');
  return { global, canvas, doc, session, actions, detach };
}

test('damage binding clears queued weapon/jump actions synchronously, retains WASD and existing flight; new inputs remain blocked', () => {
  const f = fixture(), { session, actions } = f, unbind = bindLifeActions(session.playerHealth, session.loadout, actions);
  try {
    session.loadout.setScoped(true); event(f.canvas, 'mousedown', { button: 2 });
    event(f.canvas, 'mousedown', { button: 0 }); event(f.global, 'keydown', { code: 'KeyR' });
    event(f.global, 'keydown', { code: 'Digit2' }); event(f.global, 'keydown', { code: 'Space' }); event(f.global, 'keydown', { code: 'KeyW' });
    expect(actions.fire.getSnapshot().held).toBe(true); expect(actions.aim.getSnapshot()).toBe(true);
    session.recoil.kick(1); session.feedback.emit({ sequence: 1, muzzle: { x: 0, y: 1, z: 0 }, impact: null });
    session.bubbles.flight.spawn(1, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: -1 });
    const flight = session.bubbles.flight.getSnapshot();
    session.playerHealth.requestTest('hit'); session.playerHealth.step(); expect(session.loadout.getSnapshot().scoped).toBe(true);
    session.playerHealth.requestTest('down'); session.playerHealth.step();
    expect(session.loadout.getSnapshot()).toMatchObject({ lifeStatus: 'downed', scoped: false });
    expect(actions.keyboard.getSnapshot().forward).toBe(true); expect(actions.keyboard.consumeJump()).toBe(false);
    expect(actions.aim.getSnapshot()).toBe(false); expect(actions.fire.consume()).toEqual({ held: false, pressed: false });
    expect(actions.reload.consume()).toBe(false); expect(actions.switchInput.consume()).toBeNull();
    expect(session.recoil.getState()).toEqual({ riseAngle: 0, pulseAngle: 0 }); expect(session.feedback.step(0).muzzle).toBeNull();
    expect(session.bubbles.flight.getSnapshot()).toBe(flight);
    event(f.global, 'mouseup', { button: 2 }); event(f.canvas, 'mousedown', { button: 2 }); event(f.canvas, 'mousedown', { button: 0 });
    event(f.global, 'keyup', { code: 'KeyR' }); event(f.global, 'keydown', { code: 'KeyR' });
    event(f.global, 'keyup', { code: 'Digit2' }); event(f.global, 'keydown', { code: 'Digit2' });
    expect(actions.aim.getSnapshot()).toBe(false); expect(actions.fire.consume()).toEqual({ held: false, pressed: false });
    expect(actions.reload.consume()).toBe(false); expect(actions.switchInput.consume()).toBeNull();
    expect(session.loadout.step({ held: true, pressed: true }, true)).toBeNull();
  } finally { unbind(); unbind(); f.detach.forEach(fn => fn()); }
});

test('same Rapier body/controller immediately crawls, diagonal is bounded, held Space cannot jump and existing bubbles still move', () => {
  const f = fixture(), unbind = bindLifeActions(f.session.playerHealth, f.session.loadout, f.actions);
  const world = new RAPIER.World({ x: 0, y: -20, z: 0 }), adapter = new RapierMovement(world);
  try {
    world.createCollider(RAPIER.ColliderDesc.cuboid(40, .5, 40).setTranslation(0, -.5, 0).setCollisionGroups(COLLISION_GROUPS.map));
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, .92, 0));
    const collider = world.createCollider(RAPIER.ColliderDesc.capsule(.55, .35).setCollisionGroups(COLLISION_GROUPS.player), body); world.step();
    event(f.global, 'keydown', { code: 'KeyW' });
    for (let tick = 0; tick < 90; tick++) { adapter.step(body, collider, f.actions.keyboard.getSnapshot()); world.step(); }
    event(f.global, 'keydown', { code: 'Space' }); event(f.global, 'keydown', { code: 'KeyD' });
    const before = body.translation(), bodies = world.bodies.len(), colliders = world.colliders.len();
    f.session.playerHealth.requestTest('down'); f.session.playerHealth.step();
    expect(body.translation()).toEqual(before);
    f.session.bubbles.flight.spawn(1, { x: 0, y: 2, z: 0 }, { x: 0, y: 0, z: -1 });
    for (let tick = 0; tick < 60; tick++) {
      const policy = playerActionPolicy(f.session.playerHealth.getSnapshot().status), jump = f.actions.keyboard.consumeJump();
      const result = adapter.step(body, collider, f.actions.keyboard.getSnapshot(), policy.canJump && jump, .4, f.session.loadout.getSpeed() / 5, policy.maximumSpeed ?? undefined)!;
      expect(result.jumped).toBe(false); expect(Math.hypot(result.desired.x, result.desired.z) * 60).toBeLessThanOrEqual(1 + 1e-12);
      world.step(); f.session.bubbles.step(world, tick);
      expect(result.desired.y).toBeLessThanOrEqual(0);
      expect(body.translation().y).toBeLessThanOrEqual(before.y + .03); // Capsule support correction is not an accepted jump.
      if (tick === 0) expect(f.session.bubbles.flight.getSnapshot()[0].position.z).toBeCloseTo(-20 / 60);
    }
    expect(Math.hypot(body.translation().x - before.x, body.translation().z - before.z)).toBeLessThanOrEqual(1.001);
    expect(world.bodies.len()).toBe(bodies); expect(world.colliders.len()).toBe(colliders);
  } finally { unbind(); f.detach.forEach(fn => fn()); adapter.dispose(); adapter.dispose(); world.free(); }
});

test('unsubscribe detaches old session; binding already downed closes gates and consumes its stale jump', () => {
  const f = fixture();
  const unbind = bindLifeActions(f.session.playerHealth, f.session.loadout, f.actions); unbind(); unbind();
  f.session.playerHealth.requestTest('down'); f.session.playerHealth.step(); expect(f.session.loadout.canOperate()).toBe(true);
  event(f.global, 'keydown', { code: 'Space' });
  const rebind = bindLifeActions(f.session.playerHealth, f.session.loadout, f.actions);
  expect(f.session.loadout.canOperate()).toBe(false); expect(f.actions.keyboard.consumeJump()).toBe(false);
  const fresh = createTrainingSession('sniper'); expect(fresh.loadout.getSpeed()).toBe(4); expect(fresh.playerHealth.getSnapshot().status).toBe('normal');
  rebind(); f.detach.forEach(fn => fn());
});
