import { expect, test, vi } from 'vitest';
import { type RescueEligibilityFacts, type RescueParticipant } from '@bubble-arena/shared';
import { evaluateRescueEligibility, type RescueVisibilityQuery } from './rescueEligibility';
import { PlayerLifeMachine } from './playerLifeMachine';
const facts = (): RescueEligibilityFacts => ({ rescuer: { playerId: 'a', teamId: 'red', life: { status: 'normal', lifeId: 1, revision: 0 },
  position: { x: 0, y: .9, z: 0 }, grounded: true, connected: true }, target: { playerId: 'b', teamId: 'red', life: { status: 'downed', lifeId: 2, revision: 1 },
  position: { x: 2, y: .9, z: 0 }, grounded: false, connected: true }, targetRescuerId: null, matchFinished: false });
const check = (input = facts()) => evaluateRescueEligibility('b', input, () => true);
test('qualified normal/grounded teammate receives both exact life identities, inclusive 2m distance, and frozen result', () => {
  const input = facts(), query = vi.fn<RescueVisibilityQuery>(() => true), result = evaluateRescueEligibility('b', input, query);
  expect(result).toEqual({ eligible: true, distance: 2, rescuer: { playerId: 'a', lifeId: 1, revision: 0 }, target: { playerId: 'b', lifeId: 2, revision: 1 } });
  expect(query).toHaveBeenCalledTimes(1); expect(query).toHaveBeenCalledWith(input.rescuer.position, input.target!.position);
  expect(Object.isFrozen(query.mock.calls[0][0])).toBe(true);
  if (!result.eligible) throw new Error('Expected qualified result');
  expect(Object.isFrozen(result)).toBe(true); expect(Object.isFrozen(result.target)).toBe(true); expect(Object.isFrozen(result.rescuer)).toBe(true);
  Object.assign(input.target!.life, { lifeId: 9 }); expect(result.target.lifeId).toBe(2);
});
test('no target, unknown player, mismatched lookup and self never reach the map query', () => {
  const query = vi.fn(() => true);
  expect(evaluateRescueEligibility(null, facts(), query)).toEqual({ eligible: false, reason: 'no-target' });
  expect(evaluateRescueEligibility('b', { ...facts(), target: null }, query)).toEqual({ eligible: false, reason: 'target-missing' });
  expect(evaluateRescueEligibility('another', facts(), query)).toEqual({ eligible: false, reason: 'target-mismatch' });
  expect(evaluateRescueEligibility('a', { ...facts(), target: { ...facts().target!, playerId: 'a' } }, query)).toEqual({ eligible: false, reason: 'self' });
  expect(query).not.toHaveBeenCalled();
});
test.each(['rescuer', 'target'] as const)('%s must be connected and assigned to a team', field => {
  const input = facts(), player = input[field] as RescueParticipant;
  expect(check({ ...input, [field]: { ...player, connected: false } })).toEqual({ eligible: false, reason: 'disconnected' });
  expect(check({ ...input, [field]: { ...player, teamId: null } })).toEqual({ eligible: false, reason: 'unassigned-team' });
});
test('same team is required and both red and blue may rescue', () => {
  const input = facts();
  expect(check({ ...input, target: { ...input.target!, teamId: 'blue' } })).toEqual({ eligible: false, reason: 'enemy' });
  expect(check({ ...input, rescuer: { ...input.rescuer, teamId: 'blue' }, target: { ...input.target!, teamId: 'blue' } }).eligible).toBe(true);
});
test.each(['downed', 'eliminated', 'respawning'] as const)('%s rescuer is forbidden by life action policy', status => {
  const input = facts(); expect(check({ ...input, rescuer: { ...input.rescuer, life: { ...input.rescuer.life, status } } })).toEqual({ eligible: false, reason: 'rescuer-state' });
});
test.each(['normal', 'eliminated', 'respawning'] as const)('%s target cannot be rescued', status => {
  const input = facts(); expect(check({ ...input, target: { ...input.target!, life: { ...input.target!.life, status } } })).toEqual({ eligible: false, reason: 'target-state' });
});
test('only rescuer must be grounded; target movement/airborne alone does not disqualify', () => {
  expect(check().eligible).toBe(true); expect(check({ ...facts(), rescuer: { ...facts().rescuer, grounded: false } })).toEqual({ eligible: false, reason: 'airborne' });
});
test('one authoritative owner is allowed; same rescuer can revalidate, another rescuer is refused without changing ownership', () => {
  expect(check({ ...facts(), targetRescuerId: 'a' }).eligible).toBe(true);
  const busy = { ...facts(), targetRescuerId: 'c' }; expect(check(busy)).toEqual({ eligible: false, reason: 'target-busy' }); expect(busy.targetRescuerId).toBe('c');
});
test('3D centre distance includes height, has no diagonal advantage or beyond-boundary tolerance, custom cap is respected', () => {
  const input = facts();
  expect(check({ ...input, target: { ...input.target!, position: { x: 2 + 1e-9, y: .9, z: 0 } } })).toEqual({ eligible: false, reason: 'out-of-range' });
  expect(check({ ...input, target: { ...input.target!, position: { x: 1.5, y: 2.4, z: 0 } } })).toEqual({ eligible: false, reason: 'out-of-range' });
  expect(check({ ...input, target: { ...input.target!, position: { x: 0, y: 2.9, z: 0 } } }).eligible).toBe(true);
  expect(check({ ...input, target: { ...input.target!, position: { x: 0, y: .9, z: 0 } } }).eligible).toBe(true);
  expect(evaluateRescueEligibility('b', input, () => true, { maxDistance: 1.5 })).toEqual({ eligible: false, reason: 'out-of-range' });
  expect(check({ ...input, rescuer: { ...input.rescuer, position: { x: -Number.MAX_VALUE, y: 0, z: 0 } }, target: { ...input.target!, position: { x: Number.MAX_VALUE, y: 0, z: 0 } } })).toEqual({ eligible: false, reason: 'out-of-range' });
});
test('finished, distant or busy facts never query physics; occlusion denial and invalid query results cannot authorize rescue', () => {
  const query = vi.fn(() => true);
  expect(evaluateRescueEligibility('b', { ...facts(), matchFinished: true }, query)).toEqual({ eligible: false, reason: 'finished' });
  evaluateRescueEligibility('b', facts(), query, { maxDistance: 1 }); evaluateRescueEligibility('b', { ...facts(), targetRescuerId: 'other' }, query);
  expect(query).not.toHaveBeenCalled();
  expect(evaluateRescueEligibility('b', facts(), () => false)).toEqual({ eligible: false, reason: 'blocked' });
  expect(() => evaluateRescueEligibility('b', facts(), (() => 'yes') as unknown as RescueVisibilityQuery)).toThrow(TypeError);
  expect(() => evaluateRescueEligibility('b', facts(), null as unknown as RescueVisibilityQuery)).toThrow(TypeError);
  expect(() => evaluateRescueEligibility('b', facts(), () => { throw new Error('World unavailable'); })).toThrow('World unavailable');
});
test('life/position changes are reevaluated from current facts; old results never mutate life or act as completion facts', () => {
  const life = new PlayerLifeMachine(2); life.transition({ type: 'hp_depleted', hp: 0, lifeId: 2, revision: 0 }, false);
  const input = { ...facts(), target: { ...facts().target!, life: life.getSnapshot() } };
  const qualified = check(input); expect(qualified.eligible).toBe(true); expect(life.getSnapshot().status).toBe('downed');
  life.transition({ type: 'environment_death', lifeId: 2, revision: 1 }, false);
  expect(check({ ...input, target: { ...input.target, life: life.getSnapshot() } })).toEqual({ eligible: false, reason: 'target-state' });
  expect(check({ ...input, target: { ...input.target, position: { x: 2.01, y: .9, z: 0 } } })).toEqual({ eligible: false, reason: 'out-of-range' });
  expect(qualified).toMatchObject({ target: { lifeId: 2, revision: 1 } });
});
test('even finished facts are fully validated before any query, with no mutation on exception', () => {
  const input = facts(), before = structuredClone(input), query = vi.fn(() => true);
  expect(() => evaluateRescueEligibility('b', { ...input, matchFinished: true, rescuer: { ...input.rescuer, grounded: 'true' as unknown as boolean } }, query)).toThrow(TypeError);
  expect(() => evaluateRescueEligibility('b', input, query, { maxDistance: NaN })).toThrow(RangeError);
  expect(input).toEqual(before); expect(query).not.toHaveBeenCalled();
});
