export { PHYSICS_CONFIG, COLLIDER_MATERIALS } from './physics';
export { WHITEBOX_CONFIG, WHITEBOX_SOLIDS, WHITEBOX_COLLISION, WHITEBOX_COLLISION_HASH, whiteboxCollisionHash, type WhiteboxSolid } from './whitebox';
export { PLAYER_CONFIG, createMovementTuning, type MovementTuning } from './player';
export { CAMERA_CONFIG } from './camera';
export { COLLISION_GROUPS } from './collision';
export type { MovementKeys, CameraHeading, FireIntent } from './input';
export { WEAPON_IDS, WEAPON_CONFIGS, isWeaponId, parseWeaponConfig, type WeaponId, type WeaponConfig } from './weapons';
export { TRAINING_TARGET_CONFIG, TRAINING_TARGET_LAYOUT, TRAINING_RANGE_CONFIG } from './trainingTarget';
export { PLAYER_VITALS_CONFIG } from './playerVitals';
export { PLAYER_LIFE_CONFIG, PLAYER_LIFE_STATUSES, parsePlayerLifeConfig, parsePlayerLifeEvent,
  type PlayerLifeStatus, type PlayerLifeSnapshot, type PlayerLifeConfig, type PlayerLifeEvent } from './playerLife';
export { RIFLE_RECOIL_CONFIG, createRifleRecoilTuning, type RifleRecoilTuning } from './rifleRecoil';
export { RIFLE_SPREAD_CONFIG } from './rifleSpread';
export { DEFAULT_RIFLE_AMMO_POLICY, TRAINING_RIFLE_AMMO_POLICY, type RifleAmmoPolicy } from './rifleAmmoPolicy';
export { WEAPON_DAMAGE_PROFILES, parseWeaponDamageProfile, type WeaponDamageProfile, type HitRegion } from './weaponDamage';
export { BLOCK_AVATAR_CONFIG } from './blockAvatar';
export { PRIMARY_WEAPON_IDS, createWeaponHandling, WEAPON_HANDLING, SNIPER_SCOPE_CONFIG, BUBBLE_CONFIG, isPrimaryWeaponId, weaponGroundSpeed, type PrimaryWeaponId, type WeaponHandling } from './weaponHandling';
