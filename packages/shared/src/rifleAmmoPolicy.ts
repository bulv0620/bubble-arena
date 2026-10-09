export interface RifleAmmoPolicy { readonly autoReload: boolean; readonly infiniteReserve: boolean }
export const DEFAULT_RIFLE_AMMO_POLICY: RifleAmmoPolicy = Object.freeze({ autoReload: false, infiniteReserve: false });
/** Current local test range only; normal match ammunition remains finite. */
export const TRAINING_RIFLE_AMMO_POLICY: RifleAmmoPolicy = Object.freeze({ autoReload: true, infiniteReserve: true });
