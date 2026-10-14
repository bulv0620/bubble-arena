import { expect, test } from 'vitest';
import { TEAM_IDS, parseTeamId } from './team';
import { TRAINING_SCORE_ROSTER, TRAINING_SCORE_ACTORS as a } from './trainingScore';
import { parseDamageActor, parseScoreRoster, parseEliminationFact, parseEliminationFrame, SCORE_CONFIG } from './scoring';
const fact = () => ({ tick: 1, victim: { ...a.player, lifeId: 1 }, cause: 'finishing-damage', finisher: a['enemy-b'], downer: a['enemy-a'] });
test('single red/blue identities and scoring configuration; parsed source facts/roster are independent deeply frozen data', () => {
  expect(TEAM_IDS).toEqual(['red', 'blue']); expect(Object.isFrozen(TEAM_IDS)).toBe(true); expect(SCORE_CONFIG.eliminationPoints).toBe(1);
  for (const v of [null, 'RED', 'yellow', 1]) expect(() => parseTeamId(v)).toThrow(TypeError);
  const source = { ...a['enemy-a'] }, parsed = parseDamageActor(source); source.teamId = 'red'; expect(parsed.teamId).toBe('blue');
  const original = fact(), frozen = parseEliminationFact(original); original.victim.lifeId = 2;
  expect(frozen.victim.lifeId).toBe(1); expect(Object.isFrozen(frozen.victim)).toBe(true); expect(Object.isFrozen(frozen.finisher)).toBe(true);
  expect(Object.isFrozen(parseScoreRoster(TRAINING_SCORE_ROSTER))).toBe(true);
});
test('strict ownership/tick/life/shape validation rejects bad actors and contradictory cause fields before getter execution', () => {
  for (const id of ['', 'a b', 'x\n', String.fromCharCode(1), 'x'.repeat(65)]) expect(() => parseDamageActor({ ...a.player, playerId: id })).toThrow(TypeError);
  expect(() => parseDamageActor(Object.defineProperty({ ...a.player }, 'teamId', { get: () => { throw new Error('Must not read'); } }))).toThrow(TypeError);
  expect(() => parseEliminationFact({ ...fact(), extra: true })).toThrow(TypeError);
  expect(() => parseEliminationFact({ ...fact(), cause: 'downed-timeout' })).toThrow(TypeError);
  for (const tick of [NaN, -1, .5, Infinity, Number.MAX_SAFE_INTEGER + 1]) expect(() => parseEliminationFact({ ...fact(), tick })).toThrow(RangeError);
  expect(() => parseEliminationFact({ ...fact(), victim: { ...a.player, lifeId: 0 } })).toThrow(RangeError);
  expect(() => parseEliminationFact({ ...fact(), cause: 'kill' })).toThrow(TypeError);
});
test('bounded dense arrays reject duplicate rosters/accessors/sparse/extra/capacity data and release fresh isolated instances', () => {
  expect(() => parseScoreRoster([])).toThrow(RangeError); expect(() => parseScoreRoster([TRAINING_SCORE_ROSTER[0], TRAINING_SCORE_ROSTER[0]])).toThrow(TypeError);
  expect(() => parseEliminationFrame(new Array(1))).toThrow(TypeError); expect(() => parseEliminationFrame(Array.from({ length: 9 }, fact))).toThrow(TypeError);
  const frame = [fact()]; Object.defineProperty(frame, '0', { get: () => { throw new Error('Getter'); } }); expect(() => parseEliminationFrame(frame)).toThrow(TypeError);
  const extra = Object.assign([fact()], { custom: true }); expect(() => parseEliminationFrame(extra)).toThrow(TypeError);
  expect(() => parseScoreRoster(Array.from({ length: 9 }, (_, i) => ({ ...a.player, playerId: String(i), lifeId: 1 })))).toThrow(TypeError);
});
