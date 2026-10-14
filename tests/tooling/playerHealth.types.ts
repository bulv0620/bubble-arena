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
