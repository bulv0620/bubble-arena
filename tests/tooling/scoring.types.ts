import { TeamScoreState } from '../../packages/game-core/src/teamScoreState';
import { PlayerHealthState } from '../../packages/game-core/src/playerHealthState';
import type { TeamId, EliminationFact } from '../../packages/shared/src/index';
const team: TeamId = 'red'; void team;
// @ts-expect-error Team names are closed shared IDs.
const invalid: TeamId = 'yellow'; void invalid;
const score = new TeamScoreState([{ playerId: 'a', teamId: 'red', lifeId: 1 }]);
// @ts-expect-error A score frame requires the explicit finished gate.
score.step(1, []);
// @ts-expect-error Observers cannot assign team points.
score.getSnapshot().teams.red = 1;
// @ts-expect-error Elimination facts are scoped to victim life, not an attacker command.
const missingLife: EliminationFact = { tick: 0, victim: { playerId: 'a', teamId: 'red' }, cause: 'downed-timeout', downer: null, finisher: null }; void missingLife;
const health = new PlayerHealthState();
// @ts-expect-error A damage source must carry its captured team.
health.receiveDamage({ lifeId: 1, tick: 0, sequence: 1 }, 20, false, { playerId: 'a' });
// @ts-expect-error Read-only resolved attribution cannot be changed by an observer.
health.getElimination()!.finisher = null;
