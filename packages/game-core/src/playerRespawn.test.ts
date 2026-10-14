import { expect, test, vi } from 'vitest';
import { PLAYER_LIFE_CONFIG, RESCUE_PROTECTION_CONFIG } from '@bubble-arena/shared';
import { PlayerHealthState } from './playerHealthState';
const hit = (sequence: number, tick: number, lifeId = 1) => ({ lifeId, sequence, tick });
function eliminated(lifeId = 1) { const h = new PlayerHealthState(lifeId); h.receiveDamage(hit(1, 0, lifeId), 100, false); h.receiveDamage(hit(2, 1, lifeId), 50, false); return h; }
const identity = (h: PlayerHealthState) => ({ lifeId: h.getSnapshot().lifeId, revision: h.getSnapshot().revision });
test('five-second wait updates only whole seconds, finishes at tick301, and spawn is a same-tick new-life transaction', () => {
  const h = eliminated(), apply = vi.fn(() => true), saved = h.getSnapshot();
  expect(saved.respawnSecondsRemaining).toBe(5); expect(h.advanceTick(60, false)).toBe(false); expect(h.getSnapshot()).toBe(saved);
  h.advanceTick(61, false); expect(h.getSnapshot().respawnSecondsRemaining).toBe(4);
  h.advanceTick(300, false); expect(h.getSnapshot()).toMatchObject({ status: 'eliminated', respawnSecondsRemaining: 1 });
  expect(h.completeSpawn(identity(h), 300, apply, false)).toBe(false); expect(apply).not.toHaveBeenCalled();
  h.advanceTick(301, false); expect(h.getSnapshot()).toMatchObject({ status: 'respawning', revision: 3, hp: 0, respawnSecondsRemaining: 0 });
  const fact = identity(h); expect(h.completeSpawn(fact, 301, apply, false)).toBe(true); expect(apply).toHaveBeenCalledTimes(1);
  expect(h.getSnapshot()).toMatchObject({ status: 'normal', lifeId: 2, revision: 4, hp: 100, downedHp: 0, protected: true, eliminationReason: null, downedSecondsRemaining: 0 });
  expect(h.completeSpawn(fact, 301, apply, false)).toBe(false); expect(apply).toHaveBeenCalledTimes(1);
});
test('timeout uses its original tick even after skipped clock steps; no extra five seconds from late observation', () => {
  const h = new PlayerHealthState(); h.receiveDamage(hit(1, 100), 100, false); h.advanceTick(1599, false);
  expect(h.getSnapshot()).toMatchObject({ status: 'eliminated', respawnSecondsRemaining: 1 }); h.advanceTick(1600, false); expect(h.getSnapshot().status).toBe('respawning');
  const late = new PlayerHealthState(); late.receiveDamage(hit(1, 0), 100, false); late.advanceTick(2000, false); expect(late.getSnapshot().status).toBe('respawning');
});
test('spawn protection is exactly120ticks; old-life damage/fire/revision reject and fresh identities work', () => {
  const h = eliminated(); h.advanceTick(301, false); h.completeSpawn(identity(h), 301, () => true, false);
  expect(h.isProtected(420)).toBe(true); expect(h.isProtected(421)).toBe(false);
  expect(h.receiveDamage(hit(900, 302, 1), 100, false)).toBe(false);
  expect(h.onAcceptedFire({ lifeId: 1, revision: 4, sequence: 999, tick: 302 }, false)).toBe(false);
  expect(h.onAcceptedFire({ lifeId: 2, revision: 3, sequence: 999, tick: 302 }, false)).toBe(false);
  expect(h.receiveDamage(hit(1, 320, 2), 20, false)).toBe(false); h.advanceTick(421, false);
  expect(h.receiveDamage(hit(1, 421, 2), 20, false)).toBe(false); expect(h.receiveDamage(hit(2, 421, 2), 20, false)).toBe(true); expect(h.getSnapshot().hp).toBe(80);
});
test('only accepted current-life fire ends spawn protection and restores outgoing/incoming control', () => {
  const h = eliminated(); h.advanceTick(301, false); h.completeSpawn(identity(h), 301, () => true, false);
  expect(h.canCauseControl(302, false)).toBe(false); expect(h.canReceiveControl(302, false)).toBe(false);
  expect(h.onAcceptedFire({ lifeId: 2, revision: 4, sequence: 1, tick: 302 }, false)).toBe(true);
  expect(h.canCauseControl(302, false)).toBe(true); expect(h.canReceiveControl(302, false)).toBe(true);
  expect(h.receiveDamage(hit(1, 302, 2), 100, false)).toBe(true); expect(h.getSnapshot()).toMatchObject({ status: 'downed', lifeId: 2, downedSecondsRemaining: 20 });
});
test('rejected, throwing, malformed and reentrant application stays non-playable and can retry safely', () => {
  const h = eliminated(); h.advanceTick(301, false); const fact = identity(h), saved = h.getSnapshot();
  expect(h.completeSpawn(fact, 301, () => false, false)).toBe(false); expect(h.getSnapshot()).toBe(saved);
  expect(() => h.completeSpawn(fact, 301, () => { throw new Error('Map unavailable'); }, false)).toThrow('Map unavailable');
  expect(() => h.completeSpawn(fact, 301, () => undefined as unknown as boolean, false)).toThrow(TypeError);
  expect(h.getSnapshot()).toBe(saved);
  expect(h.completeSpawn(fact, 301, () => {
    expect(h.completeSpawn(fact, 301, () => { throw new Error('Recursive application'); }, false)).toBe(false);
    expect(h.advanceTick(999, false)).toBe(false); expect(h.advanceProtection(999, false)).toBe(false); return true;
  }, false)).toBe(true);
});
test('finished/old tick/identity and strict callback/fact/gate validation do not invoke external mutation', () => {
  const h = eliminated(); expect(h.advanceTick(301, true)).toBe(false); h.advanceTick(301, false); const apply = vi.fn(() => true), saved = h.getSnapshot();
  for (const fact of [{ lifeId: 1, revision: 2 }, { lifeId: 2, revision: 3 }]) expect(h.completeSpawn(fact, 301, apply, false)).toBe(false);
  expect(h.completeSpawn(identity(h), 300, apply, false)).toBe(false); expect(h.completeSpawn(identity(h), 301, apply, true)).toBe(false);
  expect(() => h.completeSpawn({ ...identity(h), hp: 100 } as ReturnType<typeof identity>, 301, apply, false)).toThrow(TypeError);
  expect(() => h.completeSpawn(Object.defineProperty(identity(h), 'revision', { get: () => { throw new Error('Getter'); } }), 301, apply, false)).toThrow(TypeError);
  expect(() => h.completeSpawn({ lifeId: 0, revision: 3 }, 301, apply, false)).toThrow(RangeError);
  expect(() => h.completeSpawn(identity(h), 301, null as unknown as () => boolean, false)).toThrow(TypeError);
  expect(() => h.completeSpawn(identity(h), 301, apply, undefined as unknown as boolean)).toThrow(TypeError);
  expect(apply).not.toHaveBeenCalled(); expect(h.getSnapshot()).toBe(saved);
});
test('protection/identity overflow rejects before application and configured spawn protection is isolated', () => {
  for (const h of [eliminated(Number.MAX_SAFE_INTEGER), eliminated()]) {
    h.advanceTick(301, false); const apply = vi.fn(() => true), saved = h.getSnapshot();
    expect(() => h.completeSpawn(identity(h), h.getSnapshot().lifeId === Number.MAX_SAFE_INTEGER ? 301 : Number.MAX_SAFE_INTEGER, apply, false)).toThrow(RangeError);
    expect(apply).not.toHaveBeenCalled(); expect(h.getSnapshot()).toBe(saved);
  }
  const h = new PlayerHealthState(1, { ...PLAYER_LIFE_CONFIG, respawnDelay: .5 }, RESCUE_PROTECTION_CONFIG, { protectionDuration: .5, clearance: .005 });
  h.receiveDamage(hit(1, 0), 100, false); h.receiveDamage(hit(2, 1), 50, false); h.advanceTick(31, false); h.completeSpawn(identity(h), 31, () => true, false);
  expect(h.isProtected(60)).toBe(true); expect(h.isProtected(61)).toBe(false);
});
