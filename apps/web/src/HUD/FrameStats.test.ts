import { expect, test, vi } from 'vitest';
import { FrameStats } from './FrameStats';
test('rendered FPS samples twice per second, ignores pause gaps and releases subscriptions', () => {
  const stats = new FrameStats(), notify = vi.fn(), release = stats.subscribe(notify);
  expect(stats.getSnapshot()).toBeNull();
  for (let i = 0; i < 60; i++) stats.frame(1 / 60);
  expect(stats.getSnapshot()).toBe(60); expect(notify).toHaveBeenCalledTimes(1);
  stats.frame(8); stats.frame(NaN);
  for (let i = 0; i < 30; i++) stats.frame(1 / 30);
  expect(stats.getSnapshot()).toBe(30); expect(notify).toHaveBeenCalledTimes(2);
  release(); release(); for (let i = 0; i < 120; i++) stats.frame(1 / 120);
  expect(stats.getSnapshot()).toBe(120); expect(notify).toHaveBeenCalledTimes(2);
});
