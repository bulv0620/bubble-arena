import { expect, test } from 'vitest';
import { TRAINING_SCORE_ACTORS as actors } from '@bubble-arena/shared';
import { createTrainingSession, restartTrainingSession } from './trainingSession';
import { CombatLog, COMBAT_LOG_CONFIG } from './CombatLog';
import { PlayerHealthState } from '@bubble-arena/game-core';

test('real player transitions preserve downer vs different finisher, with no replay duplicates', () => {
  const s = createTrainingSession();
  s.playerHealth.configureTestSource('enemy-a'); s.playerHealth.requestTest('down'); s.playerHealth.step();
  expect(s.combatLog.getSnapshot()).toMatchObject([{ kind: 'downed', actor: actors['enemy-a'], victim: actors.player, lifeId: 1 }]);
  s.playerHealth.configureTestSource('enemy-b');
  for (let i = 0; i < 15; i++) { s.playerHealth.requestTest('hit'); s.playerHealth.step(); }
  expect(s.combatLog.getSnapshot()).toMatchObject([{ kind: 'downed' }, { kind: 'eliminated', actor: actors['enemy-b'] }]);
  s.playerHealth.requestTest('replay-score'); s.playerHealth.step(); s.playerHealth.step();
  expect(s.combatLog.getSnapshot()).toHaveLength(2);
  const next = restartTrainingSession(s);
  expect(s.combatLog.getSnapshot()).toEqual([]); expect(next.combatLog.getSnapshot()).toEqual([]);
  s.playerHealth.step(); expect(next.combatLog.getSnapshot()).toEqual([]); next.dispose();
});
test('real arena opponent emits player-caused knockdown and elimination independently of scoring drains', () => {
  const s = createTrainingSession('rifle', { arena: true }), bot = s.opponent!;
  bot.advance(0);
  bot.receiveHit({ tick: 0, sequence: 1 }, 100);
  expect(s.combatLog.getSnapshot()[0]).toMatchObject({ actor: actors.player, victim: actors['enemy-a'], kind: 'downed' });
  bot.receiveHit({ tick: 0, sequence: 2 }, 300);
  bot.drainScoreFacts(); bot.drainScoreFacts();
  expect(s.combatLog.getSnapshot()[1]).toMatchObject({ actor: actors.player, kind: 'eliminated' });
  expect(s.combatLog.getSnapshot()).toHaveLength(2); s.dispose();
});
test('bubble timeout creates no elimination event; expiry/capacity/dispose follow simulation ticks', () => {
  const s=createTrainingSession();s.playerHealth.configureTestSource('enemy-a');s.playerHealth.requestTest('down');s.playerHealth.step();
  for(let i=0;i<1200;i++)s.playerHealth.step();
  expect(s.combatLog.getSnapshot()).toHaveLength(1);expect(s.playerHealth.getSnapshot().status).toBe('normal');
  s.combatLog.step(COMBAT_LOG_CONFIG.lifetimeTicks-1);expect(s.combatLog.getSnapshot()).toHaveLength(1);
  s.combatLog.step(COMBAT_LOG_CONFIG.lifetimeTicks);expect(s.combatLog.getSnapshot()).toEqual([]);s.combatLog.step(10);expect(s.combatLog.getSnapshot()).toEqual([]);
  expect(()=>s.combatLog.step(NaN)).toThrow(RangeError);s.dispose();s.dispose();

  const log = new CombatLog();
  for (let i = 0; i < 9; i++) {
    const rule = new PlayerHealthState(i + 1), listeners = new Set<() => void>();
    log.bind({ getTick: () => 0, getSnapshot: rule.getSnapshot, getDowner: rule.getDowner, getElimination: rule.getElimination, subscribe: fn => { listeners.add(fn); return () => { listeners.delete(fn); }; } }, actors.player);
    rule.receiveDamage({ lifeId: i + 1, tick: 0, sequence: 1 }, 100, false);
    listeners.forEach(fn => fn()); listeners.forEach(fn => fn());
  }
  expect(log.getSnapshot()).toHaveLength(COMBAT_LOG_CONFIG.capacity);
  expect(log.getSnapshot()[0]?.id).toBe(4);
  expect(log.getSnapshot().every(event => event.actor === null)).toBe(true);
  log.dispose(); expect(log.getSnapshot()).toEqual([]);
});
