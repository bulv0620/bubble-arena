import { expect, test } from 'vitest';
import { RESCUE_CONFIG, parseRescueConfig, parseRescueEligibilityFacts, parseRescueTargetId, parseRescuePosition, type RescueEligibilityFacts } from './rescue';
const facts = (): RescueEligibilityFacts => ({ rescuer: { playerId: 'a', teamId: 'red', life: { status: 'normal', lifeId: 1, revision: 0 },
  position: { x: 0, y: .9, z: 0 }, grounded: true, connected: true }, target: { playerId: 'b', teamId: 'red', life: { status: 'downed', lifeId: 2, revision: 1 },
  position: { x: 2, y: .9, z: 0 }, grounded: false, connected: true }, targetRescuerId: null, matchFinished: false });

test('rescue distance is single-source 2m, configurable and immutable without repeating the existing 3s duration', () => {
  expect(RESCUE_CONFIG).toEqual({ maxDistance: 2 }); expect(Object.isFrozen(RESCUE_CONFIG)).toBe(true);
  const input = { maxDistance: 1.5 }, parsed = parseRescueConfig(input); input.maxDistance = 9; expect(parsed.maxDistance).toBe(1.5);
  expect(Object.isFrozen(parsed)).toBe(true);
  for (const maxDistance of [0, -1, Infinity, NaN, '2']) expect(() => parseRescueConfig({ maxDistance })).toThrow();
  expect(() => parseRescueConfig({ maxDistance: 2, duration: 3 })).toThrow(TypeError);
});
test('participant/fact parser makes a deep frozen copy, accepts missing target/unassigned team and safe life identities', () => {
  const input = facts(), result = parseRescueEligibilityFacts(input);
  Object.assign(input.target!.position, { x: 99 }); Object.assign(input.target!.life, { revision: 9 });
  expect(result.target!.position.x).toBe(2); expect(result.target!.life.revision).toBe(1);
  for (const item of [result, result.rescuer, result.target, result.rescuer.life, result.target!.position]) expect(Object.isFrozen(item)).toBe(true);
  expect(parseRescueEligibilityFacts({ ...facts(), target: null }).target).toBeNull();
  expect(parseRescueEligibilityFacts({ ...facts(), rescuer: { ...facts().rescuer, teamId: null } }).rescuer.teamId).toBeNull();
  expect(parseRescueEligibilityFacts({ ...facts(), rescuer: { ...facts().rescuer, life: { status: 'normal', lifeId: Number.MAX_SAFE_INTEGER, revision: Number.MAX_SAFE_INTEGER } } }).rescuer.life.lifeId).toBe(Number.MAX_SAFE_INTEGER);
});
test('unknown/missing fields, symbol fields, class instances and accessors reject before getter execution at every depth', () => {
  for (const input of [null, [], {}, new Date(), { ...facts(), damage: 10 }, { ...facts(), [Symbol('hidden')]: 1 },
    Object.defineProperty({ ...facts() }, 'hidden', { value: 1 })]) expect(() => parseRescueEligibilityFacts(input)).toThrow(TypeError);
  for (const key of ['rescuer', 'target', 'targetRescuerId', 'matchFinished']) {
    const missing = { ...facts() } as unknown as Record<string, unknown>; delete missing[key];
    expect(() => parseRescueEligibilityFacts(missing)).toThrow(TypeError);
  }
  const getter = () => { throw new Error('Getter must not execute'); };
  const inputs = [Object.defineProperty({ ...facts() }, 'rescuer', { get: getter }),
    { ...facts(), rescuer: Object.defineProperty({ ...facts().rescuer }, 'playerId', { get: getter }) },
    { ...facts(), target: { ...facts().target, life: Object.defineProperty({ ...facts().target!.life }, 'status', { get: getter }) } },
    { ...facts(), target: { ...facts().target, position: Object.defineProperty({ x: 0, y: 0, z: 0 }, 'x', { get: getter }) } },
    { ...facts(), target: { ...facts().target, position: { x: 0, y: 0, z: 0, teleport: true } } },
    { ...facts(), target: { ...facts().target, life: { ...facts().target!.life, hp: 50 } } }];
  for (const input of inputs) expect(() => parseRescueEligibilityFacts(input)).toThrow(TypeError);
});
test('invalid booleans/teams/positions/life identities cannot be coerced into authoritative facts', () => {
  for (const value of [1, 'true', null, undefined]) {
    expect(() => parseRescueEligibilityFacts({ ...facts(), matchFinished: value })).toThrow(TypeError);
    for (const key of ['connected', 'grounded']) expect(() => parseRescueEligibilityFacts({ ...facts(), rescuer: { ...facts().rescuer, [key]: value } })).toThrow(TypeError);
  }
  for (const teamId of ['', 'green', 1, undefined]) expect(() => parseRescueEligibilityFacts({ ...facts(), target: { ...facts().target, teamId } })).toThrow(TypeError);
  for (const lifeId of [0, -1, 1.5, Infinity, '1', Number.MAX_SAFE_INTEGER + 1]) expect(() => parseRescueEligibilityFacts({ ...facts(), target: { ...facts().target, life: { status: 'downed', lifeId, revision: 1 } } })).toThrow(RangeError);
  for (const revision of [-1, .5, NaN, '1']) expect(() => parseRescueEligibilityFacts({ ...facts(), target: { ...facts().target, life: { status: 'downed', lifeId: 1, revision } } })).toThrow(RangeError);
  expect(() => parseRescueEligibilityFacts({ ...facts(), target: { ...facts().target, life: { ...facts().target!.life, status: 'dead' } } })).toThrow(TypeError);
  for (const coordinate of [NaN, Infinity, -Infinity, '1']) for (const key of ['x', 'y', 'z']) expect(() => parseRescuePosition({ x: 0, y: 0, z: 0, [key]: coordinate })).toThrow(RangeError);
});
test('target selection is nullable opaque player ID, not a nickname, coordinate or successful-rescue payload', () => {
  expect(parseRescueTargetId(null)).toBeNull(); expect(parseRescueTargetId('player-123')).toBe('player-123');
  expect(parseRescueTargetId('a'.repeat(64))).toHaveLength(64);
  for (const id of ['', ' ', ' a', 'a b', 'a\n', 'a\u0000', 'a\u007f', 'a'.repeat(65), 1, undefined, {}, { playerId: 'b', position: { x: 0, y: 0, z: 0 } }]) expect(() => parseRescueTargetId(id)).toThrow(TypeError);
});
