import { beforeAll, expect, test } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { COLLISION_GROUPS } from '@bubble-arena/shared';
import { KeyboardInput } from '../player/KeyboardInput';
import { RapierMovement } from '../player/RapierMovement';
import { AimInput } from '../input/AimInput';
import { FireInput } from '../weapons/FireInput';
import { ReloadInput } from '../weapons/ReloadInput';
import { WeaponSwitchInput } from '../weapons/WeaponSwitchInput';
import { PointerLockInput } from '../camera/PointerLockInput';
import { createTrainingSession } from './trainingSession';
import { bindWeaponChanges } from './bindWeaponChanges';
beforeAll(async () => { await RAPIER.init(); });
const event = (target: EventTarget, type: string, fields = {}) => target.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), fields));
test('actual switch binding preserves held movement/jump while clearing old fire/reload/aim, without stopping the same Rapier controller', () => {
  const world = new RAPIER.World({ x: 0, y: -20, z: 0 }), adapter = new RapierMovement(world);
  const global = new EventTarget(), canvas = new EventTarget(), doc = Object.assign(new EventTarget(), { hidden: false, visibilityState: 'visible' as DocumentVisibilityState, pointerLockElement: null });
  const keyboard = new KeyboardInput(), aim = new AimInput(), pointer = new PointerLockInput(), fire = new FireInput(pointer, aim), reload = new ReloadInput(), switchInput = new WeaponSwitchInput();
  const session = createTrainingSession();
  const detach = [keyboard.attach(global, doc), aim.attach(canvas, global, doc), pointer.attach(canvas, global, doc, () => {}, () => {}), fire.attach(canvas, global, doc), reload.attach(global, doc), switchInput.attach(global, doc),
    bindWeaponChanges(session.loadout, { aim, fire, reload, switchInput }, session.motion, session.recoil)];
  try {
    world.createCollider(RAPIER.ColliderDesc.cuboid(40, .5, 40).setTranslation(0, -.5, 0).setCollisionGroups(COLLISION_GROUPS.map));
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, .92, 0));
    const collider = world.createCollider(RAPIER.ColliderDesc.capsule(.55, .35).setCollisionGroups(COLLISION_GROUPS.player), body); world.step();
    event(global, 'keydown', { code: 'KeyS' });
    for (let i = 0; i < 90; i++) { adapter.step(body, collider, keyboard.getSnapshot()); world.step(); }
    event(global, 'keydown', { code: 'Space' }); event(canvas, 'mousedown', { button: 2 }); event(canvas, 'mousedown', { button: 0 }); event(global, 'keydown', { code: 'KeyR' });
    event(global, 'keydown', { code: 'Digit2' }); session.loadout.select(switchInput.consume()!);
    expect(keyboard.getSnapshot().backward).toBe(true); expect(keyboard.consumeJump()).toBe(true);
    expect(aim.getSnapshot()).toBe(false); expect(fire.consume()).toEqual({ held: false, pressed: false }); expect(reload.consume()).toBe(false);
    const before = body.translation().z;
    const result = adapter.step(body, collider, keyboard.getSnapshot(), false, 0, session.loadout.getSpeed() / 5)!; world.step();
    expect(result.desired.z).toBeGreaterThanOrEqual(5 / 60); expect(body.translation().z).toBeGreaterThan(before + .08);
    session.loadout.select(1); expect(keyboard.getSnapshot().backward).toBe(true);
    expect(adapter.step(body, collider, keyboard.getSnapshot())!.desired.z).toBeGreaterThan(0);
    global.dispatchEvent(new Event('blur')); expect(keyboard.getSnapshot().backward).toBe(false);
  } finally { detach.forEach(fn => fn()); adapter.dispose(); world.free(); }
});
