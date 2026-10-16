import { expect, test } from 'vitest';
import { PLAYER_LIFE_CONFIG, type PlayerLifeEvent, type PlayerLifeStatus } from '@bubble-arena/shared';
import { PlayerLifeMachine } from './playerLifeMachine';

type FactOnly<T> = T extends unknown ? Omit<T, 'lifeId' | 'revision'> : never;
function eventFor(machine: PlayerLifeMachine, fact: FactOnly<PlayerLifeEvent>): PlayerLifeEvent {
  const { lifeId, revision } = machine.getSnapshot(); return { lifeId, revision, ...fact };
}
const send = (machine: PlayerLifeMachine, fact: FactOnly<PlayerLifeEvent>) => machine.transition(eventFor(machine, fact), false);
function inState(status: PlayerLifeStatus) {
  const life = new PlayerLifeMachine();
  if (status === 'downed') send(life, { type: 'hp_depleted', hp: 0 });
  if (status === 'eliminated' || status === 'respawning') send(life, { type: 'environment_death' });
  if (status === 'respawning') send(life, { type: 'respawn_due', elapsedTicks: 300 });
  return life;
}

test('normal HP depletion enters downed; a separate depletion can finish that life, without automatic respawn', () => {
  const life = new PlayerLifeMachine(), initial = life.getSnapshot();
  expect(initial).toEqual({ status: 'normal', lifeId: 1, revision: 0 }); expect(Object.isFrozen(initial)).toBe(true);
  expect(send(life, { type: 'hp_depleted', hp: 1 })).toBe(false); expect(life.getSnapshot()).toBe(initial);
  const first = eventFor(life, { type: 'hp_depleted', hp: 0 });
  expect(life.transition(first, false)).toBe(true);
  const downed = life.getSnapshot(); expect(downed).toEqual({ status: 'downed', lifeId: 1, revision: 1 });
  expect(life.transition(first, false)).toBe(false); expect(life.getSnapshot()).toBe(downed);
  expect(send(life, { type: 'hp_depleted', hp: 0 })).toBe(true);
  expect(life.getSnapshot()).toEqual({ status: 'eliminated', lifeId: 1, revision: 2 });
});
test('20s timeout requires all 1200 authoritative ticks and early/repeated facts retain snapshot identity', () => {
  const life = inState('downed'), saved = life.getSnapshot();
  expect(send(life, { type: 'downed_timeout', elapsedTicks: 1199 })).toBe(false); expect(life.getSnapshot()).toBe(saved);
  const due = eventFor(life, { type: 'downed_timeout', elapsedTicks: 1200 });
  expect(life.transition(due, false)).toBe(true); const recovered = life.getSnapshot(); expect(recovered.status).toBe('normal');
  expect(life.transition(due, false)).toBe(false); expect(life.getSnapshot()).toBe(recovered);
});
test('completed 2s rescue returns to the same life, rejecting an old depletion even after returning to normal', () => {
  const life = new PlayerLifeMachine(), old = eventFor(life, { type: 'hp_depleted', hp: 0 });
  life.transition(old, false);
  expect(send(life, { type: 'rescue_completed', elapsedTicks: 119 })).toBe(false);
  expect(send(life, { type: 'rescue_completed', elapsedTicks: 120 })).toBe(true);
  const revived = life.getSnapshot(); expect(revived).toEqual({ status: 'normal', lifeId: 1, revision: 2 });
  expect(life.transition(old, false)).toBe(false); expect(life.getSnapshot()).toBe(revived);
});
test('5s elimination delay enters respawning; only spawn completion starts the next life, with no extra waiting', () => {
  const life = inState('eliminated');
  expect(send(life, { type: 'respawn_due', elapsedTicks: 299 })).toBe(false);
  expect(send(life, { type: 'spawn_completed' })).toBe(false);
  expect(send(life, { type: 'respawn_due', elapsedTicks: 300 })).toBe(true);
  const spawning = life.getSnapshot(); expect(spawning).toMatchObject({ status: 'respawning', lifeId: 1 });
  const completed = eventFor(life, { type: 'spawn_completed' });
  expect(life.transition(completed, false)).toBe(true);
  const fresh = life.getSnapshot(); expect(fresh).toMatchObject({ status: 'normal', lifeId: 2 });
  expect(life.transition(completed, false)).toBe(false); expect(life.getSnapshot()).toBe(fresh);
  expect(life.transition({ type: 'hp_depleted', hp: 0, lifeId: 1, revision: fresh.revision }, false)).toBe(false);
});
test.each(['normal', 'downed'] as const)('environmental elimination can bypass %s without a downed delay', status => {
  const life = inState(status); expect(send(life, { type: 'environment_death' })).toBe(true);
  expect(life.getSnapshot().status).toBe('eliminated');
});
test.each(['normal', 'downed', 'eliminated', 'respawning'] as const)('%s rejects incompatible facts and finished blocks every transition', status => {
  const life = inState(status), original = life.getSnapshot();
  const facts: FactOnly<PlayerLifeEvent>[] = [{ type: 'hp_depleted', hp: 0 }, { type: 'downed_timeout', elapsedTicks: 1200 },
    { type: 'rescue_completed', elapsedTicks: 120 }, { type: 'environment_death' }, { type: 'respawn_due', elapsedTicks: 300 }, { type: 'spawn_completed' }];
  const allowed = { normal: ['hp_depleted', 'environment_death'], downed: ['hp_depleted', 'downed_timeout', 'rescue_completed', 'environment_death'],
    eliminated: ['respawn_due'], respawning: ['spawn_completed'] }[status];
  for (const fact of facts) {
    expect(life.transition(eventFor(life, fact), true)).toBe(false); expect(life.getSnapshot()).toBe(original);
    if (!allowed.includes(fact.type)) { expect(send(life, fact)).toBe(false); expect(life.getSnapshot()).toBe(original); }
  }
});
test('config is copied and fractional durations round up; the machine owns no clock', () => {
  const config = { ...PLAYER_LIFE_CONFIG, downedDuration: .025 }, life = new PlayerLifeMachine(7, config);
  config.downedDuration = 999;
  expect(life.config.downedDuration).toBe(.025); expect(Object.isFrozen(life.config)).toBe(true);
  send(life, { type: 'hp_depleted', hp: 0 });
  for (let i = 0; i < 100; i++) expect(send(life, { type: 'downed_timeout', elapsedTicks: 1 })).toBe(false);
  expect(send(life, { type: 'downed_timeout', elapsedTicks: 2 })).toBe(true);
});
test('invalid events/gates/config/overflow fail before mutation and instances remain independent', () => {
  const life = new PlayerLifeMachine(), saved = life.getSnapshot(), other = new PlayerLifeMachine();
  expect(() => life.transition({ type: 'hp_depleted', hp: NaN, lifeId: 1, revision: 0 }, false)).toThrow(RangeError);
  expect(() => life.transition(eventFor(life, { type: 'hp_depleted', hp: 0 }), undefined as unknown as boolean)).toThrow(TypeError);
  expect(life.getSnapshot()).toBe(saved);
  for (const id of [0, -1, .5, NaN, Infinity]) expect(() => new PlayerLifeMachine(id)).toThrow(RangeError);
  expect(() => new PlayerLifeMachine(1, { ...PLAYER_LIFE_CONFIG, respawnDelay: 0 })).toThrow(RangeError);
  send(life, { type: 'hp_depleted', hp: 0 }); expect(other.getSnapshot()).toEqual(saved);
  const exhausted = new PlayerLifeMachine(Number.MAX_SAFE_INTEGER);
  send(exhausted, { type: 'environment_death' }); send(exhausted, { type: 'respawn_due', elapsedTicks: 300 });
  const waiting = exhausted.getSnapshot();
  expect(() => send(exhausted, { type: 'spawn_completed' })).toThrow(RangeError); expect(exhausted.getSnapshot()).toBe(waiting);
});
