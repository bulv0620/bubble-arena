import { expect, test } from 'vitest';
import { ArenaBotBrain } from './arenaBotBrain';
const self = { x: 0, z: 0 }, target = { x: 0, z: 10 };
test('LOS and reaction delay precede bounded bursts; losing sight requires a fresh reaction', () => {
  const bot = new ArenaBotBrain();
  expect(bot.step(0, self, target, 'normal', 'normal', true, true).fire).toBe(false);
  expect(bot.step(44, self, target, 'normal', 'normal', true, true).fire).toBe(false);
  expect(bot.step(45, self, target, 'normal', 'normal', true, true).fire).toBe(true);
  expect(bot.step(65, self, target, 'normal', 'normal', true, true).fire).toBe(false);
  expect(bot.step(137, self, target, 'normal', 'normal', true, true).fire).toBe(true);
  expect(bot.step(138, self, target, 'normal', 'normal', false, true).fire).toBe(false);
  expect(bot.step(139, self, target, 'normal', 'normal', true, true).fire).toBe(false);
});
test('patrol has normalized finite intent, range/death/finished gates prevent firing and reset removes acquired target', () => {
  const bot = new ArenaBotBrain();
  const patrol = bot.step(0, { x: -6, z: -22 }, { x: -6, z: 22 }, 'normal', 'normal', true, true);
  expect(Math.hypot(patrol.x, patrol.z)).toBeCloseTo(1); expect(patrol.fire).toBe(false);
  for (const [i, status] of (['downed', 'eliminated', 'respawning'] as const).entries()) expect(bot.step(1 + i, self, target, status, 'normal', true, true)).toMatchObject({ x: 0, z: 0, fire: false });
  expect(bot.step(4, self, target, 'normal', 'normal', true, false).fire).toBe(false);
  bot.reset(); expect(bot.step(0, self, target, 'normal', 'normal', true, true).fire).toBe(false);
  expect(() => bot.step(-1, self, target, 'normal', 'normal', true, true)).toThrow();
});
