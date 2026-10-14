import { expect, test } from 'vitest';
import { MatchState } from './matchState';
import { parseMatchConfig } from '@bubble-arena/shared';

test('waiting requires authority readiness; countdown cannot be skipped or repeated', () => {
  const m = new MatchState();
  expect(m.start(100, false)).toBe(false); expect(m.getSnapshot().phase).toBe('waiting');
  expect(m.start(100, true)).toBe(true); expect(m.start(101, true)).toBe(false);
  expect(m.advance(159)).toMatchObject({ phase: 'countdown', countdownRemaining: 3, secondsRemaining: 300 });
  expect(m.advance(160).countdownRemaining).toBe(2);
  expect(m.advance(279).phase).toBe('countdown');
  expect(m.advance(280)).toMatchObject({ phase: 'playing', secondsRemaining: 300 });
  expect(m.advance(339).secondsRemaining).toBe(300); expect(m.advance(340).secondsRemaining).toBe(299);
});
test('fixed time survives missed updates, duplicate and old ticks, finish is irreversible', () => {
  const m = new MatchState({ countdownSeconds: 3, durationSeconds: 5, scoreLimit: 20 });
  expect(m.finish(0)).toBe(false); m.start(0, true); m.advance(300);
  expect(m.getSnapshot()).toMatchObject({ phase: 'playing', secondsRemaining: 3 });
  const old = m.getSnapshot(); expect(m.advance(200)).toBe(old); expect(m.advance(300)).toBe(old);
  m.advance(480); expect(m.getSnapshot().secondsRemaining).toBe(0);
  expect(m.finish(479)).toBe(false); expect(m.finish(480)).toBe(true);
  const final = m.getSnapshot(); expect(m.finish(481)).toBe(false); expect(m.start(500, true)).toBe(false); expect(m.advance(1000)).toBe(final);
});
test('reject invalid duration, fields, accessors and ticks without running getters', () => {
  for (const tick of [-1, .5, NaN, Infinity]) expect(() => new MatchState().advance(tick)).toThrow();
  for (const config of [{ countdownSeconds: 0, durationSeconds: 300, scoreLimit: 20 }, { countdownSeconds: 3, durationSeconds: 3601, scoreLimit: 20 }, { countdownSeconds: 3, durationSeconds: 300, scoreLimit: .5 }, { countdownSeconds: 3, durationSeconds: 300, scoreLimit: 20, points: 5 }]) expect(() => parseMatchConfig(config)).toThrow();
  const config = { countdownSeconds: 3, durationSeconds: 300, get scoreLimit() { throw Error('getter executed'); } };
  expect(() => parseMatchConfig(config)).toThrow('Invalid match config field');
  expect(Object.isFrozen(new MatchState().config)).toBe(true);
});
