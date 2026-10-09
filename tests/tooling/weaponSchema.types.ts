import { WEAPON_CONFIGS, type WeaponConfig, type WeaponId } from '../../packages/shared/src/index';

const validId: WeaponId = 'rifle';
const validConfig: WeaponConfig = WEAPON_CONFIGS[validId];
void validConfig;
// @ts-expect-error Unknown IDs must fail at compile time.
const unknownId: WeaponId = 'laser';
void unknownId;
// @ts-expect-error Numeric fields must not accept strings.
const stringDamage: WeaponConfig = { ...validConfig, damage: '20' };
void stringDamage;
// @ts-expect-error Required config fields cannot be omitted.
const incomplete: WeaponConfig = { id: 'rifle', damage: 20 };
void incomplete;
// @ts-expect-error Shared defaults must remain readonly.
validConfig.magazineSize = 1;
