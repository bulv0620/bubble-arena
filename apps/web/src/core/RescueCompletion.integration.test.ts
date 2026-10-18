import { beforeAll, expect, test } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { WEAPON_IDS, COLLISION_GROUPS } from '@bubble-arena/shared';
import { createTrainingSession } from './trainingSession';
import { bindLifeActions } from './bindLifeActions';
import type { RescueInputState } from '../input/RescueInput';
const at = { x: 10.88, y: .91, z: 0 };
const input: RescueInputState = { held: false, active: true, move: false, jump: false, fire: false, reload: false, weaponSwitch: false, aim: false };
const press = { held: true, pressed: true }, idle = { held: false, pressed: false };
beforeAll(async () => { await RAPIER.init(); });
function fixture() {
  const world = new RAPIER.World({ x: 0, y: -20, z: 0 }), session = createTrainingSession();
  world.createCollider(RAPIER.ColliderDesc.cuboid(40, .5, 40).setTranslation(0, -.5, 0).setCollisionGroups(COLLISION_GROUPS.map)); world.step();
  const noop = { clear: () => {} };
  const detach = bindLifeActions(session.playerHealth, session.loadout, { aim: noop, fire: noop, reload: noop, switchInput: noop,
    keyboard: { consumeJump: () => false }, feedback: session.feedback, recoil: session.recoil });
  const step = (state = input) => { session.playerHealth.step(); return session.rescue.step(world, at, true, state); };
  session.rescue.configure('self-rescue'); step();
  return { world, session, step, cleanup: () => { detach(); session.rescue.dispose(); world.free(); } };
}
function rescue(f: ReturnType<typeof fixture>) {
  f.session.playerHealth.requestTest('down'); f.step();
  for (let tick = 0; tick < 119; tick++) f.step(); expect(f.session.playerHealth.getSnapshot().status).toBe('downed');
  f.step(); expect(f.session.playerHealth.getSnapshot()).toMatchObject({ status: 'normal', hp: 50, protected: true, lifeId: 1, revision: 2 });
}
test.each(WEAPON_IDS)('%s self rescue preserves weapon/ammo and world objects, restores normal control after 120 fresh ticks', weapon => {
  const f = fixture();
  try {
    f.session.loadout.select(weapon === 'bubble' ? 4 : weapon === 'sniper' ? 3 : weapon === 'shotgun' ? 2 : 1);
    const shot = f.session.loadout.step(press)!; f.session.playerHealth.onAcceptedFire(shot.sequence);
    const ammo = f.session.loadout.getSnapshot().ammo.magazine, bodies = f.world.bodies.len(), colliders = f.world.colliders.len();
    rescue(f);
    expect(f.session.score.getSnapshot().players.find(p => p.playerId === 'training-ally')?.rescues).toBe(1);
    expect(f.session.loadout.getSnapshot()).toMatchObject({ active: weapon, lifeStatus: 'normal', rescuing: false, ammo: { magazine: ammo } });
    expect(f.session.loadout.getSpeed()).toBeCloseTo(weapon === 'sniper' ? 4.8 : weapon === 'rifle' ? 6 : 6.6);
    expect(f.session.rescue.getSnapshot().channel).toBeNull(); expect(f.session.rescue.getSnapshot().message).toContain('你已被救起');
    expect(f.world.bodies.len()).toBe(bodies); expect(f.world.colliders.len()).toBe(colliders);
    expect(f.session.playerHealth.getDamageRevision()).toBe(1); f.step(); expect(f.session.playerHealth.getDamageRevision()).toBe(1);
    expect(f.session.rescue.getSnapshot().message).not.toContain('伤害');
  } finally { f.cleanup(); }
});
test('protection ignores actual queued hurt for 59 ticks, expires at 60; pause releases helper and resumes a fresh full channel', () => {
  const f = fixture();
  try {
    f.session.playerHealth.requestTest('down'); f.step(); for (let tick = 0; tick < 30; tick++) f.step();
    f.step({ ...input, active: false }); expect(f.session.rescue.getSnapshot().channel).toBeNull();
    for (let tick = 0; tick < 119; tick++) f.step(); expect(f.session.playerHealth.getSnapshot().status).toBe('downed');
    f.step(); expect(f.session.playerHealth.getSnapshot().hp).toBe(50);
    for (let tick = 0; tick < 59; tick++) { f.session.playerHealth.requestTest('hit'); f.step(); }
    expect(f.session.playerHealth.getSnapshot()).toMatchObject({ hp: 50, protected: true });
    f.session.playerHealth.requestTest('hit'); f.step(); expect(f.session.playerHealth.getSnapshot()).toMatchObject({ hp: 30, protected: false });
  } finally { f.cleanup(); }
});
test('rejected reload-time fire does not end protection; accepted bubble fire ends it before control gate and hurt', () => {
  const f = fixture();
  try {
    f.session.loadout.step(press); rescue(f);
    f.session.loadout.step(idle, true); const denied = f.session.loadout.step(press);
    expect(denied).toBeNull(); expect(f.session.playerHealth.getSnapshot().protected).toBe(true); expect(f.session.playerHealth.canCauseControl()).toBe(false);
    f.session.loadout.select(4); const accepted = f.session.loadout.step(press)!;
    expect(f.session.playerHealth.onAcceptedFire(accepted.sequence)).toBe(true); expect(f.session.playerHealth.canCauseControl()).toBe(true);
    f.session.playerHealth.requestTest('hit'); f.step(); expect(f.session.playerHealth.getSnapshot().hp).toBe(30);
  } finally { f.cleanup(); }
});
