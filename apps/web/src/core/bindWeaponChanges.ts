import { WEAPON_HANDLING } from '@bubble-arena/shared';
import type { LocalLoadout } from '../weapons/LocalLoadout';
import type { RifleMotion } from '../weapons/RifleMotion';
import type { RifleRecoil } from '../weapons/RifleRecoil';
interface WeaponActions { readonly aim: { clear(): void }; readonly fire: { clear(): void }; readonly reload: { clear(): void }; readonly switchInput: { clear(): void } }
/** Switching invalidates weapon actions, leaving held movement and queued jump untouched. */
export function clearWeaponActions(actions: WeaponActions) {
  actions.aim.clear(); actions.fire.clear(); actions.reload.clear(); actions.switchInput.clear();
}
export function bindWeaponChanges(loadout: LocalLoadout, actions: WeaponActions, motion: RifleMotion, recoil: RifleRecoil) {
  let active = loadout.getSnapshot().active;
  recoil.setTuning(WEAPON_HANDLING[active].recoil);
  return loadout.subscribe(() => {
    const next = loadout.getSnapshot().active;
    if (next !== active) { active = next; clearWeaponActions(actions); recoil.setTuning(WEAPON_HANDLING[next].recoil); }
    motion.refresh();
  });
}
