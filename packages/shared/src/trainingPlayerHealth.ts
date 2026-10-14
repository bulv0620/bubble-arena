import { PLAYER_VITALS_CONFIG } from './playerVitals';
import { WEAPON_CONFIGS } from './weapons';
/** Local training intents select these fixed simulation values; not a multiplayer command. */
export const TRAINING_PLAYER_HEALTH_CONFIG = Object.freeze({ hitDamage: WEAPON_CONFIGS.rifle.damage, downDamage: PLAYER_VITALS_CONFIG.maxHp });
