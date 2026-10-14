import type { LocalLoadout } from '../weapons/LocalLoadout';
import { clearWeaponActions } from './bindWeaponChanges';
export function bindRescueActions(loadout: LocalLoadout, actions: Parameters<typeof clearWeaponActions>[0], keyboard: { consumeJump(): boolean }, recoil: { reset(): void }) {
  let rescuing = loadout.getSnapshot().rescuing;
  if (rescuing) { clearWeaponActions(actions); keyboard.consumeJump(); recoil.reset(); }
  return loadout.subscribe(() => {
    const next = loadout.getSnapshot().rescuing;
    if (next === rescuing) return;
    rescuing = next; clearWeaponActions(actions); keyboard.consumeJump(); recoil.reset();
  });
}
