import { expect, test } from 'vitest';
import { TRAINING_SCORE_ROSTER, TRAINING_SCORE_ACTORS as a, type EliminationFact } from '@bubble-arena/shared';
import { TeamScoreState } from './teamScoreState';
const fact = (tick = 1): EliminationFact => ({ tick, victim: { ...a.player, lifeId: 1 }, cause: 'finishing-damage', finisher: a['enemy-b'], downer: a['enemy-a'] });
const line = (s: TeamScoreState, id: string) => s.getSnapshot().players.find(p => p.playerId === id)!;
test('finisher scores +1 and a distinct downer gets an assist; repeated fact/frame never scores twice', () => {
  const s = new TeamScoreState(TRAINING_SCORE_ROSTER), e = fact();
  s.step(1, [e, e], false); expect(s.getSnapshot().teams).toEqual({ red: 0, blue: 1 });
  expect(line(s, a['enemy-b'].playerId)).toMatchObject({ eliminations: 1, assists: 0 }); expect(line(s, a['enemy-a'].playerId)).toMatchObject({ eliminations: 0, assists: 1 });
  expect(s.getSnapshot().lastEvents).toHaveLength(1); const saved = s.getSnapshot();
  for (const tick of [1, 0, 2, 3]) expect(s.step(tick, [e], false)).toBe(saved);
  expect(Object.isFrozen(saved.teams)).toBe(true); expect(Object.isFrozen(saved.players[0])).toBe(true);
});
test('timeout credits the downer; same-person finish has no assist; unowned finishing cannot transfer credit to downer', () => {
  for (const cause of ['downed-timeout', 'finishing-damage'] as const) {
    const s = new TeamScoreState(TRAINING_SCORE_ROSTER);
    s.step(1, [{ ...fact(), cause, finisher: cause === 'downed-timeout' ? null : a['enemy-a'] }], false);
    expect(line(s, a['enemy-a'].playerId)).toMatchObject({ eliminations: 1, assists: 0 }); expect(s.getSnapshot().teams.blue).toBe(1);
  }
  const s = new TeamScoreState(TRAINING_SCORE_ROSTER); s.step(1, [{ ...fact(), finisher: null }], false); expect(s.getSnapshot().teams.blue).toBe(0);
});
test('environment, suicide, self and friendly facts award neither points nor assists and consume only one elimination', () => {
  for (const e of [{ ...fact(), cause: 'environment', finisher: null }, { ...fact(), cause: 'suicide', finisher: null }, { ...fact(), finisher: a.player }, { ...fact(), finisher: a.ally }]) {
    const s = new TeamScoreState(TRAINING_SCORE_ROSTER); s.step(1, [e as EliminationFact], false);
    expect(s.getSnapshot().teams).toEqual({ red: 0, blue: 0 }); expect(s.getSnapshot().players.every(p => p.eliminations === 0 && p.assists === 0)).toBe(true);
    expect(s.step(2, [fact()], false).teams.blue).toBe(0);
  }
});
test('whole tick aggregates both teams before future end checks; duplicate delivery cannot bias one team', () => {
  const s = new TeamScoreState(TRAINING_SCORE_ROSTER), redVictim = { ...fact(), downer: a['enemy-b'] }, blueVictim = { ...fact(), victim: { ...a['enemy-a'], lifeId: 1 }, finisher: a.player, downer: a.player };
  s.step(1, [redVictim, blueVictim], false); expect(s.getSnapshot().teams).toEqual({ red: 1, blue: 1 }); expect(s.getSnapshot().lastEvents).toHaveLength(2);
  const copy = new TeamScoreState(TRAINING_SCORE_ROSTER); copy.step(1, [blueVictim, redVictim], false); expect(copy.getSnapshot().teams).toEqual(s.getSnapshot().teams);
  expect(s.step(1, [blueVictim], false).teams).toEqual({ red: 1, blue: 1 });
});
test('registered spawn opens a new life; previous-life/future-life/prebirth facts cannot score or poison the current life', () => {
  const s = new TeamScoreState(TRAINING_SCORE_ROSTER); s.step(1, [fact()], false); expect(s.beginLife(a.player.playerId, 2, 5, false)).toBe(true);
  expect(s.beginLife(a.player.playerId, 2, 5, false)).toBe(false); expect(s.beginLife(a.player.playerId, 4, 5, false)).toBe(false);
  s.step(6, [fact()], false); expect(s.getSnapshot().teams.blue).toBe(1);
  s.step(7, [{ ...fact(7), victim: { ...a.player, lifeId: 3 } }], false); expect(s.getSnapshot().teams.blue).toBe(1);
  s.step(8, [{ ...fact(4), victim: { ...a.player, lifeId: 2 } }], false); expect(s.getSnapshot().teams.blue).toBe(1);
  s.step(9, [{ ...fact(9), victim: { ...a.player, lifeId: 2 } }], false); expect(s.getSnapshot().teams.blue).toBe(2);
});
test('archived match actors keep captured teams/credit even if the outside roster mutates or disconnects', () => {
  const roster = TRAINING_SCORE_ROSTER.map(p => ({ ...p })), s = new TeamScoreState(roster);
  roster.splice(roster.findIndex(p => p.playerId === a['enemy-a'].playerId), 1); roster[0].teamId = 'blue';
  s.step(20, [{ ...fact(20), cause: 'downed-timeout', finisher: null }], false); expect(s.getSnapshot().teams).toEqual({ red: 0, blue: 1 });
  expect(line(s, a['enemy-a'].playerId).eliminations).toBe(1);
});
test('unknown/mismatched identities do not consume life; finished, invalid and conflicting frames fail atomically', () => {
  const s = new TeamScoreState(TRAINING_SCORE_ROSTER), saved = s.getSnapshot();
  expect(s.step(1, [fact()], true)).toBe(saved); expect(s.beginLife(a.player.playerId, 2, 1, true)).toBe(false);
  expect(s.step(1, [{ ...fact(1), finisher: { playerId: 'unknown', teamId: 'blue' } }], false)).toBe(saved);
  expect(s.step(2, [{ ...fact(2), victim: { ...a.player, teamId: 'blue', lifeId: 1 } }], false)).toBe(saved);
  expect(() => s.step(3, [{ ...fact(4) }], false)).toThrow(RangeError);
  expect(() => s.step(3, [fact(3), { ...fact(3), finisher: a['enemy-a'] }], false)).toThrow(TypeError);
  expect(() => s.step(3, [{ ...fact(3), victim: { ...a.player, lifeId: 0 } }], false)).toThrow(RangeError);
  expect(() => s.step(3, [], undefined as unknown as boolean)).toThrow(TypeError); expect(() => s.step(-1, [], false)).toThrow(RangeError);
  expect(s.getSnapshot()).toBe(saved); s.step(3, [fact(3)], false); expect(s.getSnapshot().teams.blue).toBe(1);
});
test('no-op steps keep stable references; instances and new match resets have no shared counters or life locks', () => {
  const s = new TeamScoreState(TRAINING_SCORE_ROSTER), initial = s.getSnapshot(); for (let i = 0; i < 60; i++) expect(s.step(i, [], false)).toBe(initial);
  s.step(60, [fact(60)], false); const fresh = new TeamScoreState(TRAINING_SCORE_ROSTER); expect(fresh.getSnapshot().teams.blue).toBe(0); fresh.step(1, [fact()], false); expect(fresh.getSnapshot().teams.blue).toBe(1);
});
