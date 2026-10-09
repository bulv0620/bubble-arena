import { expect, test, vi } from 'vitest';
import { ShotFeedback } from './ShotFeedback';
const p = { x: 1, y: 2, z: 3 };
test('accepted unique visuals expire independently and subscriptions clean up', () => {
  const feedback = new ShotFeedback(), listener = vi.fn(), un = feedback.subscribe(listener);
  expect(feedback.step(0)).toEqual({ muzzle: null, impact: null });
  expect(feedback.emit({ sequence: 1, muzzle: p, impact: p })).toBe(true);
  expect(feedback.emit({ sequence: 1, muzzle: p, impact: p })).toBe(false);
  expect(listener).toHaveBeenCalledTimes(1);
  expect(Object.isFrozen(listener.mock.calls[0][0].muzzle)).toBe(true);
  expect(feedback.step(0.36)).toEqual({ muzzle: null, impact: p });
  expect(feedback.step(0.3)).toEqual({ muzzle: null, impact: null });
  un(); un(); feedback.emit({ sequence: 2, muzzle: p, impact: null });
  expect(listener).toHaveBeenCalledTimes(1); expect(feedback.step(0)).toEqual({ muzzle: p, impact: null });
  feedback.clear(); expect(feedback.step(0)).toEqual({ muzzle: null, impact: null });
  expect(feedback.emit({ sequence: 2, muzzle: p, impact: p })).toBe(false);
});
test('invalid events cannot publish and long frame expires visuals without lingering', () => {
  const feedback = new ShotFeedback(), listener = vi.fn(); feedback.subscribe(listener);
  for (const sequence of [0, -1, NaN, 1.5]) expect(() => feedback.emit({ sequence, muzzle: p, impact: null })).toThrow(TypeError);
  expect(() => feedback.emit({ sequence: 1, muzzle: { ...p, x: Infinity }, impact: p })).toThrow(TypeError);
  expect(listener).not.toHaveBeenCalled();
  feedback.emit({ sequence: 1, muzzle: p, impact: p });
  expect(feedback.step(NaN).muzzle).toEqual(p); expect(feedback.step(-1).muzzle).toEqual(p);
  expect(feedback.step(60)).toEqual({ muzzle: null, impact: null });
});
test('pellet visuals retain all actual points, expire traces before impacts and clear without object accumulation', () => {
  const feedback = new ShotFeedback(), pellets = Array.from({ length: 8 }, (_, i) => ({ point: { x: i, y: 1, z: -3 }, hit: i < 7 }));
  feedback.emit({ sequence: 1, muzzle: p, impact: null, pellets }); pellets[0].point.x = 99;
  expect(feedback.getPelletState().pellets).toHaveLength(8); expect(feedback.getPelletState().pellets[0].point.x).toBe(0);
  feedback.step(.26); expect(feedback.getPelletState().showTraces).toBe(false); expect(feedback.getPelletState().pellets).toHaveLength(8);
  feedback.step(.2); expect(feedback.getPelletState().pellets).toEqual([]);
  for (let sequence = 2; sequence < 100; sequence++) feedback.emit({ sequence, muzzle: p, impact: null, pellets });
  expect(feedback.getPelletState().pellets).toHaveLength(8); feedback.clear(); expect(feedback.getPelletState().pellets).toEqual([]);
});
test('invalid or oversized pellet arrays reject before publishing', () => {
  const feedback = new ShotFeedback();
  expect(() => feedback.emit({ sequence: 1, muzzle: p, impact: null, pellets: Array.from({ length: 17 }, () => ({ point: p, hit: true })) })).toThrow(TypeError);
  expect(() => feedback.emit({ sequence: 1, muzzle: p, impact: null, pellets: [{ point: { ...p, x: NaN }, hit: true }] })).toThrow(TypeError);
  expect(feedback.getPelletState().pellets).toEqual([]);
});
