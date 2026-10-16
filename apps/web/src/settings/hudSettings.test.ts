import { expect, test, vi } from 'vitest';
import { HUD_SETTINGS, fitHudScale, readHudScale, saveHudScale } from './hudSettings';

test('HUD preference survives a new reader and does not overwrite mouse sensitivity', () => {
  const entries = new Map([['bubble-arena.mouse-speed.v1', '.05']]);
  const storage = { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => { entries.set(key, value); } };
  expect(readHudScale(storage)).toBe(1);
  for (const scale of [.5, .75, 1, 1.25, 1.5]) {
    expect(saveHudScale(storage, scale)).toBe(true);
    expect(readHudScale({ ...storage })).toBe(scale);
  }
  expect(entries.get('bubble-arena.mouse-speed.v1')).toBe('.05');
});

test('missing, invalid or unavailable storage falls back safely without writing corrupt data', () => {
  const setItem = vi.fn();
  for (const raw of [null, '', ' ', 'bad', 'NaN', 'Infinity', '.49', '1.51']) {
    expect(readHudScale({ getItem: () => raw, setItem })).toBe(HUD_SETTINGS.default);
  }
  for (const value of [NaN, Infinity, -1, 0, .49, 1.51]) {
    expect(saveHudScale({ getItem: () => null, setItem }, value)).toBe(false);
  }
  expect(setItem).not.toHaveBeenCalled();
  const blocked = { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('quota'); } };
  expect(readHudScale(blocked)).toBe(1);
  expect(saveHudScale(blocked, 1.25)).toBe(false);
});

test('desktop scaling is exact; narrow and short viewports fit without changing the preference', () => {
  for (const scale of [.5, .75, 1, 1.25, 1.5]) expect(fitHudScale(scale, 1280, 800)).toBe(scale);
  expect(fitHudScale(1.5, 390, 844)).toBeCloseTo(390 / 340);
  expect(fitHudScale(1.5, 320, 480)).toBeCloseTo(320 / 340);
  expect(fitHudScale(1.5, 800, 600)).toBeCloseTo(800 / 576);
  expect(fitHudScale(1.5, 1280, 400)).toBe(1);
  expect(fitHudScale(.5, 320, 480)).toBe(.5);
  // Resizing back restores the requested value; no fitted value is persisted.
  expect(fitHudScale(1.5, 1280, 800)).toBe(1.5);
});

test('unmeasured or invalid viewport uses a safe validated preference', () => {
  for (const [width, height] of [[0, 0], [-1, 720], [1280, NaN], [Infinity, 720]]) {
    expect(fitHudScale(1.25, width, height)).toBe(1.25);
  }
  expect(fitHudScale(NaN, 1280, 800)).toBe(1);
});
