import { expect, test } from 'vitest';
import { PLAYER_LIFE_CONFIG, PLAYER_LIFE_STATUSES, parsePlayerLifeConfig, parsePlayerLifeEvent } from './playerLife';

test('life parameters match the current four-state rules and parsed config is an immutable independent copy', () => {
  expect(PLAYER_LIFE_STATUSES).toEqual(['normal', 'downed', 'eliminated', 'respawning']);
  expect(PLAYER_LIFE_CONFIG).toEqual({ downedHp: 50, revivedHp: 50, downedDuration: 20, rescueDuration: 3, respawnDelay: 5 });
  const input = { ...PLAYER_LIFE_CONFIG }, parsed = parsePlayerLifeConfig(input);
  input.downedDuration = 999;
  expect(parsed.downedDuration).toBe(20); expect(Object.isFrozen(parsed)).toBe(true);
});
test.each([0, -1, NaN, Infinity, Number.MAX_VALUE])('invalid life durations %s are rejected before tick conversion', value => {
  for (const key of ['downedDuration', 'rescueDuration', 'respawnDelay']) {
    expect(() => parsePlayerLifeConfig({ ...PLAYER_LIFE_CONFIG, [key]: value })).toThrow(RangeError);
  }
});
test('health, shapes, accessors and unknown nonenumerable fields cannot enter life config', () => {
  for (const downedHp of [0, .5, '50']) expect(() => parsePlayerLifeConfig({ ...PLAYER_LIFE_CONFIG, downedHp })).toThrow();
  expect(() => parsePlayerLifeConfig({ ...PLAYER_LIFE_CONFIG, revivedHp: 101 })).toThrow(RangeError);
  const accessor = Object.defineProperty({ ...PLAYER_LIFE_CONFIG }, 'downedHp', { get: () => { throw new Error('must not read'); } });
  expect(() => parsePlayerLifeConfig(accessor)).toThrow(TypeError);
  const hidden = Object.defineProperty({ ...PLAYER_LIFE_CONFIG }, 'extra', { value: 1 });
  expect(() => parsePlayerLifeConfig(hidden)).toThrow(TypeError);
  for (const bad of [null, [], new Date(), {}, { ...PLAYER_LIFE_CONFIG, extra: 1 }]) expect(() => parsePlayerLifeConfig(bad)).toThrow(TypeError);
});
test('life fact parser requires exact fields and safe identities; it does not coerce client-like payloads', () => {
  const event = { type: 'hp_depleted', hp: 0, lifeId: 1, revision: 0 };
  const parsed = parsePlayerLifeEvent(event); event.hp = 99;
  expect(parsed).toMatchObject({ hp: 0 }); expect(Object.isFrozen(parsed)).toBe(true);
  for (const bad of [null, [], {}, { ...event, type: 'teleport' }, { ...event, damage: 100 },
    { ...event, hp: '0' }, { ...event, lifeId: 0 }, { ...event, revision: -1 }, { ...event, hp: .5 },
    { ...event, lifeId: Number.MAX_SAFE_INTEGER + 1 },
    { type: 'spawn_completed', lifeId: 1, revision: 0, elapsedTicks: 300 },
    { type: 'downed_timeout', lifeId: 1, revision: 0 },
    { type: 'downed_timeout', lifeId: 1, revision: 0, elapsedTicks: Infinity }]) expect(() => parsePlayerLifeEvent(bad)).toThrow();
  const accessor = Object.defineProperty({ ...event }, 'hp', { get: () => { throw new Error('must not read'); } });
  expect(() => parsePlayerLifeEvent(accessor)).toThrow(TypeError);
  expect(() => parsePlayerLifeEvent({ ...event, [Symbol('extra')]: 1 })).toThrow(TypeError);
});
