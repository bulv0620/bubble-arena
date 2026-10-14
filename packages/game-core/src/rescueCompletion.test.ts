import { expect, test } from 'vitest';
import { PLAYER_LIFE_CONFIG, type RescueProgressFrame } from '@bubble-arena/shared';
import { PlayerHealthState } from './playerHealthState';
import { RescueProgress } from './rescueProgress';
const fact = { lifeId: 1, revision: 1, elapsedTicks: 180 };
function downed() { const health = new PlayerHealthState(); health.receiveDamage({ lifeId: 1, sequence: 1, tick: 0 }, 100, false); return health; }
function frame(health: PlayerHealthState): RescueProgressFrame {
  const state = health.getSnapshot();
  return { players: [{ playerId: 'a', teamId: 'red', life: { status: 'normal', lifeId: 1, revision: 0 }, position: { x: 0, y: .9, z: 0 }, grounded: true, connected: true },
    { playerId: 'b', teamId: 'red', life: { status: state.status, lifeId: state.lifeId, revision: state.revision }, position: { x: 1, y: .9, z: 0 }, grounded: true, connected: true }],
  controls: [{ playerId: 'a', targetPlayerId: 'b', held: true, active: true, move: false, jump: false, fire: false, reload: false, weaponSwitch: false, aim: false }], damagedPlayerIds: [], matchFinished: false };
}
test('completion restores 50 standing HP/normal in the same life with a new revision, clears downed pool and grants exactly 60 ticks', () => {
  const health = downed(); expect(health.completeRescue(fact, 180, false)).toBe(true);
  expect(health.getSnapshot()).toMatchObject({ status: 'normal', hp: 50, downedHp: 0, lifeId: 1, revision: 2, protected: true, lastDamage: 0 });
  expect(health.isProtected(180)).toBe(true); expect(health.isProtected(239)).toBe(true); expect(health.isProtected(240)).toBe(false);
  health.advanceProtection(239, false); expect(health.getSnapshot().protected).toBe(true);
  health.advanceProtection(240, false); expect(health.getSnapshot().protected).toBe(false);
  const saved = health.getSnapshot(); expect(health.completeRescue(fact, 240, false)).toBe(false); expect(health.getSnapshot()).toBe(saved);
});
test('early, old, wrong-life/revision, normal and finished completion reject without healing or changing identity', () => {
  const health = downed(), saved = health.getSnapshot();
  for (const input of [{ ...fact, elapsedTicks: 179 }, { ...fact, lifeId: 2 }, { ...fact, revision: 0 }]) expect(health.completeRescue(input, 180, false)).toBe(false);
  expect(health.completeRescue(fact, 180, true)).toBe(false); expect(health.getSnapshot()).toBe(saved);
  health.advanceProtection(100, false); expect(health.completeRescue(fact, 99, false)).toBe(false);
  expect(new PlayerHealthState().completeRescue(fact, 180, false)).toBe(false);
});
test('protected damage is consumed for dedupe, cannot replay after expiry, and late damage from before rescue rejects', () => {
  const health = downed(); health.completeRescue(fact, 180, false);
  const saved = health.getSnapshot(); expect(health.receiveDamage({ lifeId: 1, sequence: 2, tick: 200 }, 20, false)).toBe(false); expect(health.getSnapshot()).toBe(saved);
  health.advanceProtection(240, false);
  expect(health.receiveDamage({ lifeId: 1, sequence: 2, tick: 240 }, 20, false)).toBe(false);
  expect(health.receiveDamage({ lifeId: 1, sequence: 3, tick: 179 }, 20, false)).toBe(false);
  expect(health.receiveDamage({ lifeId: 1, sequence: 3, tick: 240 }, 20, false)).toBe(true); expect(health.getSnapshot().hp).toBe(30);
});
test('accepted current-life fire ends protection; stale/duplicate/wrong-life/finished fire cannot end or extend it', () => {
  const health = downed(); health.completeRescue(fact, 180, false);
  const fire = { lifeId: 1, revision: 2, sequence: 1, tick: 181 };
  for (const stale of [{ ...fire, revision: 0 }, { ...fire, lifeId: 2 }, { ...fire, tick: 179 }]) expect(health.onAcceptedFire(stale, false)).toBe(false);
  expect(health.onAcceptedFire(fire, true)).toBe(false); expect(health.isProtected(181)).toBe(true);
  expect(health.onAcceptedFire(fire, false)).toBe(true); expect(health.onAcceptedFire(fire, false)).toBe(false);
  expect(health.receiveDamage({ lifeId: 1, sequence: 2, tick: 181 }, 20, false)).toBe(true); expect(health.getSnapshot().hp).toBe(30);
  const expired = downed(); expired.completeRescue(fact, 180, false);
  expect(expired.onAcceptedFire({ ...fire, tick: 240 }, false)).toBe(false); expect(expired.getSnapshot().protected).toBe(false);
});
test('protection blocks incoming and outgoing control, expires/firing reenable it, downed cannot be slowed and finished blocks all control', () => {
  const health = downed(); expect(health.canReceiveControl(1, false)).toBe(false);
  health.completeRescue(fact, 180, false);
  expect(health.canReceiveControl(239, false)).toBe(false); expect(health.canCauseControl(239, false)).toBe(false);
  expect(health.canReceiveControl(240, false)).toBe(true); expect(health.canCauseControl(240, false)).toBe(true);
  expect(health.canCauseControl(240, true)).toBe(false); expect(health.canReceiveControl(240, true)).toBe(false);
  health.advanceProtection(240, false); expect(health.canReceiveControl(200, false)).toBe(false);
});
test('strict completion/fire validation and end-tick overflow fail before life mutation; configured HP/duration remain isolated', () => {
  const health = downed(), saved = health.getSnapshot();
  for (const invalid of [{ ...fact, elapsedTicks: Infinity }, { ...fact, revision: -1 }]) expect(() => health.completeRescue(invalid, 180, false)).toThrow(RangeError);
  const accessor = Object.defineProperty({ ...fact }, 'elapsedTicks', { get: () => { throw new Error('Must not read'); } });
  expect(() => health.completeRescue(accessor, 180, false)).toThrow(TypeError);
  expect(() => health.completeRescue({ ...fact, hp: 100 } as typeof fact, 180, false)).toThrow(TypeError);
  expect(() => health.completeRescue(fact, Number.MAX_SAFE_INTEGER, false)).toThrow(RangeError);
  expect(() => health.onAcceptedFire({ lifeId: 1, revision: 2, sequence: NaN, tick: 180 }, false)).toThrow(RangeError);
  expect(() => health.advanceProtection(180, undefined as unknown as boolean)).toThrow(TypeError);
  expect(health.getSnapshot()).toBe(saved);
  const custom = new PlayerHealthState(1, { ...PLAYER_LIFE_CONFIG, revivedHp: 70 }, { duration: .5 }); custom.receiveDamage({ lifeId: 1, sequence: 1, tick: 0 }, 100, false);
  custom.completeRescue(fact, 180, false); expect(custom.getSnapshot().hp).toBe(70); expect(custom.isProtected(210)).toBe(false); expect(health.getSnapshot().status).toBe('downed');
});
test('only current 180-tick owned channel is consumable, completion frees the actor/target and stale ready cannot repeat', () => {
  const health = downed(), progress = new RescueProgress();
  for (let tick = 0; tick < 180; tick++) progress.step(tick, frame(health), () => true);
  expect(progress.complete(178, 'a', () => { throw new Error('Wrong tick'); }, false)).toBe(false);
  expect(progress.complete(179, 'a', channel => health.completeRescue({ lifeId: channel.target.lifeId, revision: channel.target.revision, elapsedTicks: channel.elapsedTicks }, 179, false), false)).toBe(true);
  expect(progress.getSnapshot()).toMatchObject({ channels: [], events: [{ kind: 'completed', targetId: 'b' }] });
  expect(progress.complete(179, 'a', () => { throw new Error('Duplicate'); }, false)).toBe(false);
  expect(progress.step(180, frame(health), () => true).channels).toHaveLength(0); expect(health.getSnapshot().hp).toBe(50);
});
test('damage on completion tick wins; completion gate/rejected callback/error cannot leave target locked or emit success', () => {
  const health = downed(), progress = new RescueProgress();
  for (let tick = 0; tick < 179; tick++) progress.step(tick, frame(health), () => true);
  progress.step(179, { ...frame(health), damagedPlayerIds: ['b'] }, () => true);
  expect(progress.complete(179, 'a', () => true, false)).toBe(false); expect(health.getSnapshot().status).toBe('downed');
  for (const kind of ['finished', 'reject', 'throw'] as const) {
    const rule = new RescueProgress(); for (let tick = 0; tick < 180; tick++) rule.step(tick, frame(health), () => true);
    const apply = () => { if (kind === 'throw') throw new Error('Rejected transaction'); return false; };
    if (kind === 'throw') expect(() => rule.complete(179, 'a', apply, false)).toThrow('Rejected transaction');
    else expect(rule.complete(179, 'a', apply, kind === 'finished')).toBe(false);
    expect(rule.getSnapshot().channels).toHaveLength(0); expect(rule.getSnapshot().events.some(e => e.kind === 'completed')).toBe(false);
  }
});
