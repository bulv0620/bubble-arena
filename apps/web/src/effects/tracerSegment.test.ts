import { expect, test } from 'vitest';
import { tracerLifetime, tracerSegment } from './tracerSegment';

test.each(['rifle','sniper','shotgun'] as const)('%s advances a short tail along the accepted ray and never extends past its endpoint', weapon => {
  for (const distance of [.2, 3, 25, 70, 100]) {
    const lifetime = tracerLifetime(distance, weapon);
    let previous = 0;
    for (let age = 1/240; age < lifetime; age += 1/240) {
      const segment = tracerSegment(distance, age, weapon)!;
      expect(segment.start).toBeGreaterThanOrEqual(0);
      expect(segment.end).toBeGreaterThanOrEqual(segment.start);
      expect(segment.end).toBeLessThanOrEqual(distance);
      expect(segment.end).toBeGreaterThanOrEqual(previous);
      expect(segment.opacity).toBeGreaterThan(0); expect(segment.opacity).toBeLessThanOrEqual(1);
      previous = segment.end;
    }
    expect(tracerSegment(distance,lifetime,weapon)).toBeNull();
  }
});

test('shotgun uses short outward segments and finishes within 60ms at its maximum 25m range', () => {
  const segment = tracerSegment(25, .02, 'shotgun')!;
  expect(segment.start).toBeGreaterThan(0);
  expect(segment.end - segment.start).toBeLessThan(2);
  expect(tracerLifetime(25, 'shotgun')).toBeLessThan(.06);
  expect(tracerSegment(25, .06, 'shotgun')).toBeNull();
});

test('bubble and invalid geometry/age never produce fake tracer rays', () => {
  expect(tracerSegment(40,.02,'bubble')).toBeNull();
  for (const distance of [0,-1,NaN,Infinity]) expect(tracerSegment(distance,.02,'rifle')).toBeNull();
  for (const age of [-1,NaN,Infinity]) expect(tracerSegment(20,age,'rifle')).toBeNull();
  expect(tracerSegment(20,60,'rifle')).toBeNull();
});
