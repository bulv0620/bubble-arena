import type { LocalPlayerHealth } from '../player/LocalPlayerHealth';
import type { LocalLoadout } from '../weapons/LocalLoadout';
import { clearWeaponActions } from './bindWeaponChanges';
interface Actions {
  aim: { clear(): void }; fire: { clear(): void }; reload: { clear(): void }; switchInput: { clear(): void };
  keyboard: { consumeJump(): boolean }; feedback: { clear(): void }; recoil: { reset(): void };
}
/** Synchronous damage notification closes weapon gates before the next acceptance. */
export function bindLifeActions(player: LocalPlayerHealth, loadout: LocalLoadout, actions: Actions) {
  let previous: string | undefined;
  const sync = () => {
    const status = player.getSnapshot().status;
    if (status === previous) return;
    loadout.setLifeStatus(status);
    if (previous !== undefined || status !== 'normal') {
      clearWeaponActions(actions); actions.keyboard.consumeJump(); actions.feedback.clear(); actions.recoil.reset();
    }
    previous = status;
  };
  sync();
  return player.subscribe(sync);
}
