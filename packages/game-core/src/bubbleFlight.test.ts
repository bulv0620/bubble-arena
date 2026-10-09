import { expect, test, vi } from 'vitest';
import { BUBBLE_CONFIG } from '@bubble-arena/shared';
import { BubbleFlight } from './bubbleFlight';
import { MovementSlow } from './movementSlow';
const origin = { x: 0, y: 1, z: 0 }, direction = { x: 0, y: 0, z: -2 };
test('normalized fixed-step flight lasts 120 ticks, travels at 20m/s and expires without explosion', () => {
  const flight = new BubbleFlight(), explode = vi.fn(); flight.spawn(1, origin, direction);
  for (let i = 0; i < 60; i++) flight.step(() => null, explode);
  expect(flight.getSnapshot()[0].position.z).toBeCloseTo(-20); expect(flight.getSnapshot()[0].position.y).toBe(1);
  for (let i = 0; i < 60; i++) flight.step(() => null, explode);
  expect(flight.getSnapshot()).toEqual([]); expect(explode).not.toHaveBeenCalled();
});
test('swept contact explodes once at the collision point and clear removes every live projectile', () => {
  const flight = new BubbleFlight(), explode = vi.fn(); flight.spawn(1, origin, direction);
  flight.step(() => .1, explode); expect(explode).toHaveBeenCalledWith(1, { x: 0, y: 1, z: -.1 });
  flight.step(() => 0, explode); expect(explode).toHaveBeenCalledTimes(1);
  expect(flight.spawn(1, origin, direction)).toBe(false); flight.spawn(2, origin, direction); flight.clear(); expect(flight.getSnapshot()).toEqual([]);
});
test('pool is bounded and invalid identities/directions/sweep distances reject', () => {
  const flight = new BubbleFlight();
  for (let sequence = 1; sequence <= BUBBLE_CONFIG.capacity; sequence++) expect(flight.spawn(sequence, origin, direction)).toBe(true);
  expect(flight.spawn(9, origin, direction)).toBe(false);
  expect(() => flight.spawn(10, origin, { x: 0, y: 0, z: 0 })).toThrow(RangeError);
  expect(() => flight.spawn(0, origin, direction)).toThrow(TypeError);
  expect(() => flight.step(() => NaN, () => {})).toThrow(RangeError);
});
test('slow lasts exactly two fixed seconds and refreshes without stacking', () => {
  const slow = new MovementSlow(); expect(slow.getMultiplier()).toBe(1); slow.apply();
  for (let i = 0; i < 60; i++) slow.step(); expect(slow.getMultiplier()).toBe(.5); slow.apply();
  for (let i = 0; i < 119; i++) slow.step(); expect(slow.getMultiplier()).toBe(.5);
  slow.step(); expect(slow.getMultiplier()).toBe(1); slow.apply(); slow.clear(); expect(slow.getMultiplier()).toBe(1);
});
