import { expect, test } from 'vitest';
import { RESCUE_PROTECTION_CONFIG, parseRescueProtectionConfig } from './rescueProtection';
test('rescue protection is single-source 1s and parsed independent immutable config', () => {
  expect(RESCUE_PROTECTION_CONFIG).toEqual({ duration: 1 }); const input = { duration: .5 }, parsed = parseRescueProtectionConfig(input); input.duration = 10;
  expect(parsed.duration).toBe(.5); expect(Object.isFrozen(parsed)).toBe(true);
});
test('invalid duration, extra fields, accessor and tick overflow reject', () => {
  for (const duration of [0, -1, NaN, Infinity, Number.MAX_VALUE, '1']) expect(() => parseRescueProtectionConfig({ duration })).toThrow();
  for (const invalid of [null, [], { duration: 1, hp: 50 }, Object.defineProperty({}, 'duration', { get: () => { throw new Error('Must not execute'); } })]) expect(() => parseRescueProtectionConfig(invalid)).toThrow(TypeError);
});
