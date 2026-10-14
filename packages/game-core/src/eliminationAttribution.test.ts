import { expect, test } from 'vitest';
import { PLAYER_LIFE_CONFIG, RESCUE_PROTECTION_CONFIG, RESPAWN_CONFIG, TRAINING_SCORE_ACTORS as a } from '@bubble-arena/shared';
import { PlayerHealthState } from './playerHealthState';
const hit = (sequence: number, tick = sequence) => ({ lifeId: 1, sequence, tick });
function health() { return new PlayerHealthState(1, PLAYER_LIFE_CONFIG, RESCUE_PROTECTION_CONFIG, RESPAWN_CONFIG, a.player); }
test('only accepted hits capture attribution; nonlethal downed hits do not replace downer, final finisher is captured immutably', () => {
  const h = health(), source = { ...a['enemy-a'] }; h.receiveDamage(hit(1), 100, false, source); source.teamId = 'red';
  expect(h.getElimination()).toBeNull(); h.receiveDamage(hit(2), 20, false, a['enemy-b']); h.receiveDamage(hit(3), 30, false, a['enemy-b']);
  expect(h.getElimination()).toMatchObject({ cause: 'finishing-damage', tick: 3, victim: { ...a.player, lifeId: 1 }, downer: a['enemy-a'], finisher: a['enemy-b'] });
  expect(Object.isFrozen(h.getElimination()!.downer)).toBe(true); const saved = h.getElimination(); h.receiveDamage(hit(4), 100, false, a['enemy-a']); expect(h.getElimination()).toBe(saved);
});
test('timeout is attributed to actual downer even after another nonlethal actor shoots or leaves', () => {
  const h = health(); h.receiveDamage(hit(1, 0), 100, false, a['enemy-a']); h.receiveDamage(hit(2, 20), 20, false, a['enemy-b']); h.advanceTick(1200, false);
  expect(h.getElimination()).toMatchObject({ tick: 1200, cause: 'downed-timeout', downer: a['enemy-a'], finisher: null });
});
test('rescue discards old knockdown source; latest knockdown within the same life owns timeout', () => {
  const h = health(); h.receiveDamage(hit(1, 0), 100, false, a['enemy-a']); h.completeRescue({ lifeId: 1, revision: 1, elapsedTicks: 180 }, 180, false);
  h.advanceTick(240, false); h.receiveDamage(hit(2, 240), 100, false, a['enemy-b']); h.advanceTick(1440, false);
  expect(h.getElimination()).toMatchObject({ victim: { lifeId: 1 }, downer: a['enemy-b'], tick: 1440 });
});
test('friend/self damage is rejected without health/sequence changes; finished and malformed sources cannot poison attribution', () => {
  const h = health(), saved = h.getSnapshot();
  for (const actor of [a.ally, a.player]) expect(h.receiveDamage(hit(1), 100, false, actor)).toBe(false);
  expect(h.receiveDamage(hit(1), 100, true, a['enemy-b'])).toBe(false);
  expect(() => h.receiveDamage(hit(1), 100, false, Object.defineProperty({ ...a['enemy-a'] }, 'teamId', { get: () => { throw new Error('Getter'); } }))).toThrow(TypeError);
  expect(h.getSnapshot()).toBe(saved); h.receiveDamage(hit(1), 100, false, a['enemy-a']); h.advanceTick(1201, false); expect(h.getElimination()!.downer).toEqual(a['enemy-a']);
});
test('unowned damage still supports training lifecycle but has no made-up attacker; spawn clears prior elimination fact', () => {
  const h = health(); h.receiveDamage(hit(1), 100, false); h.receiveDamage(hit(2), 50, false);
  expect(h.getElimination()).toMatchObject({ downer: null, finisher: null }); h.advanceTick(302, false);
  expect(h.completeSpawn({ lifeId: 1, revision: 3 }, 302, () => true, false)).toBe(true); expect(h.getElimination()).toBeNull();
});
