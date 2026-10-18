export { PHYSICS_CONFIG, COLLIDER_MATERIALS } from './physics';
export { WHITEBOX_CONFIG, WHITEBOX_SOLIDS, WHITEBOX_COLLISION, WHITEBOX_COLLISION_HASH, whiteboxCollisionHash, type WhiteboxSolid } from './whitebox';
export { PLAYER_CONFIG, createMovementTuning, type MovementTuning } from './player';
export { CAMERA_CONFIG } from './camera';
export { COLLISION_GROUPS, HIT_MAP_CLEARANCE } from './collision';
export type { MovementKeys, CameraHeading, FireIntent } from './input';
export { WEAPON_IDS, WEAPON_CONFIGS, isWeaponId, parseWeaponConfig, weaponForSlot, weaponSlot, type WeaponSlot, type WeaponId, type WeaponConfig } from './weapons';
export { TRAINING_TARGET_CONFIG, TRAINING_TARGET_LAYOUT, TRAINING_RANGE_CONFIG } from './trainingTarget';
export { PLAYER_VITALS_CONFIG } from './playerVitals';
export { TRAINING_PLAYER_HEALTH_CONFIG } from './trainingPlayerHealth';
export { PLAYER_LIFE_CONTROL_CONFIG } from './playerLifeControl';
export { RESCUE_PROTECTION_CONFIG, parseRescueProtectionConfig, type RescueProtectionConfig } from './rescueProtection';
export { TRAINING_RESCUE_MODES, TRAINING_RESCUE_CONFIG, type TrainingRescueMode } from './trainingRescue';
export { RESCUE_CONFIG, parseRescueConfig, parseRescueTargetId, parseRescuePosition, parseRescueEligibilityFacts,
  parseRescueParticipant, parseRescueProgressFrame, RESCUE_PLAYER_CAPACITY,
  type RescueConfig, type RescueTeamId, type RescuePosition, type RescueParticipant, type RescueEligibilityFacts, type RescueControl, type RescueProgressFrame } from './rescue';
export { PLAYER_LIFE_CONFIG, PLAYER_LIFE_STATUSES, parsePlayerLifeConfig, parsePlayerLifeEvent,
  type PlayerLifeStatus, type PlayerLifeSnapshot, type PlayerLifeConfig, type PlayerLifeEvent } from './playerLife';
export { RIFLE_RECOIL_CONFIG, createRifleRecoilTuning, type RifleRecoilTuning } from './rifleRecoil';
export { RIFLE_SPREAD_CONFIG } from './rifleSpread';
export { DEFAULT_RIFLE_AMMO_POLICY, TRAINING_RIFLE_AMMO_POLICY, type RifleAmmoPolicy } from './rifleAmmoPolicy';
export { WEAPON_DAMAGE_PROFILES, parseWeaponDamageProfile, type WeaponDamageProfile, type HitRegion } from './weaponDamage';
export { BLOCK_AVATAR_CONFIG } from './blockAvatar';
export { PRIMARY_WEAPON_IDS, createWeaponHandling, WEAPON_HANDLING, SNIPER_SCOPE_CONFIG, BUBBLE_CONFIG, isPrimaryWeaponId, weaponGroundSpeed, type PrimaryWeaponId, type WeaponHandling } from './weaponHandling';

export { WHITEBOX_SPAWNS, WHITEBOX_SPAWN_HASH, RESPAWN_CONFIG, parseRespawnConfig, parseSpawnCatalog, parseSpawnEnemies, parseSpawnTeam, spawnCatalogHash, type SpawnTeam, type SpawnPoint, type SpawnCatalog, type SpawnEnemy, type RespawnConfig } from './spawn';

export { TEAM_IDS, parseTeamId, type TeamId } from './team';
export { SCORE_CONFIG, parseDamageActor, parseScoreParticipant, parseScoreRoster, parseEliminationFact, parseEliminationFrame, type DamageActor, type ScoreParticipant, type EliminationFact } from './scoring';
export { TRAINING_DAMAGE_SOURCES, TRAINING_SCORE_ACTORS, TRAINING_SCORE_ROSTER, type TrainingDamageSource } from './trainingScore';

export { MATCH_CONFIG, parseMatchConfig, type MatchConfig, type MatchPhase } from './match';

export { ARENA_CONFIG, ARENA_SOLIDS, ARENA_COLLISION, ARENA_COLLISION_HASH, ARENA_SPAWNS, ARENA_SPAWN_HASH, ARENA_DEMO_ROSTER, ARENA_BOT_CONFIG, ARENA_BOT_ROUTE, type ArenaSolid } from './arena';
export { ARENA_TEAM_SIZE, DEFAULT_ARENA_PLAYER_SEAT, DEFAULT_ARENA_BOT_SEATS, parseArenaSeat, parseArenaBotSeats, arenaBotActor, arenaActorLabel, type ArenaBotSeat } from './arenaRoster';
export { BUBBLE_TRAP_CONFIG, BUBBLE_INTERACTION_CONFIG } from './bubbleTrap';
export { LOCOMOTION_CONFIG } from './locomotion';
export { TEAM_VISION_CONFIG } from './teamVision';
export { WEAPON_PENETRATION, parseWeaponPenetration, type WeaponPenetration, type BulletMaterial } from './weaponPenetration';
