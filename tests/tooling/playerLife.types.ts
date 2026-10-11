import { type PlayerLifeSnapshot, type PlayerLifeEvent, type PlayerLifeConfig, PLAYER_LIFE_CONFIG } from '../../packages/shared/src/index';
import { PlayerLifeMachine } from '../../packages/game-core/src/playerLifeMachine';

const life = new PlayerLifeMachine();
const snapshot: PlayerLifeSnapshot = life.getSnapshot();
const depleted: PlayerLifeEvent = { type: 'hp_depleted', hp: 0, lifeId: snapshot.lifeId, revision: snapshot.revision };
life.transition(depleted, false);
// @ts-expect-error The match gate must be explicitly supplied.
life.transition(depleted);
// @ts-expect-error Snapshots cannot be mutated by consumers.
snapshot.status = 'downed';
// @ts-expect-error Phase names are closed.
const unknown: PlayerLifeSnapshot = { status: 'dead', lifeId: 1, revision: 0 };
void unknown;
// @ts-expect-error Timed facts require an authoritative tick duration.
const missingTime: PlayerLifeEvent = { type: 'respawn_due', lifeId: 1, revision: 0 };
void missingTime;
// @ts-expect-error Life identities cannot be supplied as strings.
const stringId: PlayerLifeEvent = { type: 'spawn_completed', lifeId: '1', revision: 0 };
void stringId;
// @ts-expect-error Life parameters are numeric.
const stringDuration: PlayerLifeConfig = { ...PLAYER_LIFE_CONFIG, downedDuration: '20' };
void stringDuration;
