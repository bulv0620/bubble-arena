import { expect, test } from 'vitest';
import { PLAYER_LIFE_CONFIG, type RescueControl, type RescueProgressFrame } from '@bubble-arena/shared';
import { RescueProgress } from './rescueProgress';
const control = (playerId = 'a', patch: Partial<RescueControl> = {}): RescueControl => ({ playerId, targetPlayerId: 'b', held: true, active: true,
  move: false, jump: false, fire: false, reload: false, weaponSwitch: false, aim: false, ...patch });
const frame = (): RescueProgressFrame => ({ players: [
  { playerId: 'a', teamId: 'red', life: { status: 'normal', lifeId: 1, revision: 0 }, position: { x: 0, y: .9, z: 0 }, grounded: true, connected: true },
  { playerId: 'b', teamId: 'red', life: { status: 'downed', lifeId: 1, revision: 1 }, position: { x: 2, y: .9, z: 0 }, grounded: true, connected: true },
  { playerId: 'c', teamId: 'red', life: { status: 'normal', lifeId: 1, revision: 0 }, position: { x: 0, y: .9, z: 0 }, grounded: true, connected: true },
], controls: [control()], damagedPlayerIds: [], matchFinished: false });
const run = (rule: RescueProgress, count: number, input = frame()) => { for (let tick = 0; tick < count; tick++) rule.step(tick, input, () => true); return rule.getSnapshot(); };
test('exactly 120 consecutive ticks become ready once, freeze immutable identities, cap at 100%, and never change life/HP', () => {
  const rule = new RescueProgress(), input = frame(), before = structuredClone(input);
  expect(run(rule, 119).channels[0]).toMatchObject({ elapsedTicks: 119, requiredTicks: 120, ready: false });
  expect(rule.step(119, input, () => true)).toMatchObject({ channels: [{ elapsedTicks: 120, ready: true }], events: [{ kind: 'ready', rescuerId: 'a', targetId: 'b' }] });
  const ready = rule.getSnapshot().channels[0]; expect(Object.isFrozen(ready)).toBe(true); expect(Object.isFrozen(ready.target)).toBe(true);
  expect(rule.step(120, input, () => true)).toMatchObject({ channels: [{ elapsedTicks: 120, ready: true }], events: [] }); expect(input).toEqual(before);
  expect(rule.step(121, { ...input, controls: [control('a', { held: false })] }, () => true).channels).toHaveLength(0);
});
test.each(['move', 'jump', 'fire', 'reload', 'weaponSwitch', 'aim'] as const)('%s attempt interrupts, clears progress/ownership, and requires E release before restarting', field => {
  const rule = new RescueProgress(); run(rule, 30);
  expect(rule.step(30, { ...frame(), controls: [control('a', { [field]: true })] }, () => true)).toMatchObject({ channels: [], events: [{ kind: 'interrupted', reason: 'action' }] });
  expect(rule.step(31, frame(), () => true).channels).toHaveLength(0);
  rule.step(32, { ...frame(), controls: [control('a', { held: false })] }, () => true);
  expect(rule.step(33, frame(), () => true).channels[0].elapsedTicks).toBe(1);
});
test.each(['a', 'b'])('effective damage to %s cancels before the exact completion tick', damaged => {
  const rule = new RescueProgress(); run(rule, 119);
  expect(rule.step(119, { ...frame(), damagedPlayerIds: [damaged] }, () => true)).toMatchObject({ channels: [], events: [{ kind: 'interrupted', reason: 'damaged' }] });
});
test('target movement outside range, obstruction and inactive input all cancel without inherited progress', () => {
  for (const reason of ['out-of-range', 'blocked', 'inactive'] as const) {
    const rule = new RescueProgress(); run(rule, 60); const input = frame();
    const next = reason === 'out-of-range' ? { ...input, players: input.players.map(p => p.playerId === 'b' ? { ...p, position: { x: 2.01, y: .9, z: 0 } } : p) }
      : reason === 'inactive' ? { ...input, controls: [control('a', { active: false })] } : input;
    expect(rule.step(60, next, () => reason !== 'blocked')).toMatchObject({ channels: [], events: [{ kind: 'interrupted', reason }] });
  }
});
test.each(['a', 'b'])('%s disconnection, life revision or new life invalidate an existing channel', id => {
  for (const change of ['disconnect', 'revision', 'lifeId'] as const) {
    const rule = new RescueProgress(); run(rule, 10); const input = frame();
    const players = input.players.map(p => p.playerId !== id ? p : change === 'disconnect' ? { ...p, connected: false } : { ...p, life: { ...p.life, [change]: p.life[change] + 1 } });
    expect(rule.step(10, { ...input, players }, () => true).channels).toHaveLength(0);
  }
});
test('changed target, removed target, state/team change and finished release ownership', () => {
  const inputs = [
    { ...frame(), controls: [control('a', { targetPlayerId: 'c' })] },
    { ...frame(), players: frame().players.filter(p => p.playerId !== 'b') },
    { ...frame(), players: frame().players.map(p => p.playerId === 'b' ? { ...p, life: { ...p.life, status: 'normal' as const } } : p) },
    { ...frame(), players: frame().players.map(p => p.playerId === 'b' ? { ...p, teamId: 'blue' as const } : p) },
    { ...frame(), matchFinished: true },
  ];
  for (const input of inputs) { const rule = new RescueProgress(); run(rule, 10); expect(rule.step(10, input, () => true).channels).toHaveLength(0); }
});
test('same tick candidates are deterministic and exclusive; existing owner wins over a new lower ID, release permits another actor', () => {
  for (const controls of [[control('c'), control()], [control(), control('c')]]) {
    const rule = new RescueProgress(); expect(rule.step(0, { ...frame(), controls }, () => true).channels.map(c => c.rescuer.playerId)).toEqual(['a']);
  }
  const rule = new RescueProgress(); rule.step(0, { ...frame(), controls: [control('c')] }, () => true);
  expect(rule.step(1, { ...frame(), controls: [control(), control('c')] }, () => true).channels.map(c => c.rescuer.playerId)).toEqual(['c']);
  expect(rule.step(2, { ...frame(), controls: [control(), control('c', { held: false })] }, () => true).channels).toMatchObject([{ rescuer: { playerId: 'a' }, elapsedTicks: 1 }]);
});
test('duplicate/old tick cannot count twice; tick gap cancels instead of assuming continuous hold', () => {
  const rule = new RescueProgress(), before = run(rule, 30);
  expect(rule.step(29, frame(), () => { throw new Error('Must not query twice'); })).toBe(before);
  expect(rule.step(10, frame(), () => true)).toBe(before);
  expect(rule.step(31, frame(), () => true)).toMatchObject({ channels: [], events: [{ reason: 'tick-gap' }] });
  expect(() => rule.step(NaN, frame(), () => true)).toThrow(RangeError);
});
test('invalid frame/query clears locks, and a partial ready event is suppressed if another map query fails', () => {
  const rule = new RescueProgress(); run(rule, 10);
  expect(() => rule.step(10, { ...frame(), matchFinished: 'yes' as unknown as boolean }, () => true)).toThrow(TypeError);
  expect(rule.getSnapshot().channels).toHaveLength(0);
  rule.clear(); run(rule, 119);
  const input = frame(), extra = { ...input.players[1], playerId: 'd' };
  let calls = 0;
  expect(() => rule.step(119, { ...input, players: [...input.players, extra], controls: [control(), control('c', { targetPlayerId: 'd' })] }, () => { if (++calls === 2) throw new Error('World failure'); return true; })).toThrow('World failure');
  expect(rule.getSnapshot().channels).toHaveLength(0); expect(rule.getSnapshot().events.some(e => e.kind === 'ready')).toBe(false);
});
test('clear is idempotent, frees channel/blocked history, and separate instances/configured duration remain isolated', () => {
  const rule = new RescueProgress(), short = new RescueProgress(undefined, { ...PLAYER_LIFE_CONFIG, rescueDuration: .5 });
  run(rule, 20); expect(short.getSnapshot().channels).toHaveLength(0); expect(run(short, 30).channels[0].ready).toBe(true);
  rule.clear(); rule.clear(); expect(rule.getSnapshot()).toEqual({ tick: null, channels: [], events: [] });
  expect(rule.step(0, frame(), () => true).channels[0].elapsedTicks).toBe(1);
});
