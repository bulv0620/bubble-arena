import { PlayerHealthState } from '../../packages/game-core/src/playerHealthState';
const player = new PlayerHealthState();
player.receiveDamage({ lifeId: 1, tick: 0, sequence: 1 }, 20, false);
// @ts-expect-error Authority must explicitly supply the finished gate.
player.receiveDamage({ lifeId: 1, tick: 1, sequence: 2 }, 20);
// @ts-expect-error Damage is resolved numeric simulation output.
player.receiveDamage({ lifeId: 1, tick: 1, sequence: 2 }, '20', false);
// @ts-expect-error Damage identities must scope a player life.
player.receiveDamage({ tick: 1, sequence: 2 }, 20, false);
// @ts-expect-error Observers cannot assign health.
player.getSnapshot().hp = 100;

// @ts-expect-error Rescue must carry authoritative elapsed progress and explicit match gate.
player.completeRescue({ lifeId: 1, revision: 1 }, 180);
// @ts-expect-error Clients cannot choose restored HP in a completion fact.
player.completeRescue({ lifeId: 1, revision: 1, elapsedTicks: 180, hp: 100 }, 180, false);
// @ts-expect-error Accepted fire is scoped to life revision, not a click boolean.
player.onAcceptedFire({ lifeId: 1, tick: 180, sequence: 1 }, false);
// @ts-expect-error Protection snapshots are read-only.
player.getSnapshot().protected = false;

// @ts-expect-error Countdown is authority-owned and read-only.
player.getSnapshot().downedSecondsRemaining = 20;
// @ts-expect-error The clock must explicitly receive the finished gate.
player.advanceTick(1200);
// @ts-expect-error Elimination cause is resolved internally, never observer-assigned.
player.getSnapshot().eliminationReason = 'finishing-damage';

// @ts-expect-error Spawn application and explicit match gate are required authority arguments.
player.completeSpawn({ lifeId: 1, revision: 3 }, 1500);
// @ts-expect-error Clients cannot choose coordinates or HP via the health completion fact.
player.completeSpawn({ lifeId: 1, revision: 3, hp: 100, position: { x: 0, y: 0, z: 0 } }, 1500, () => true, false);
// @ts-expect-error Respawn countdown is a read-only authority snapshot.
player.getSnapshot().respawnSecondsRemaining = 0;
