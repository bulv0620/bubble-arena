import { expect, test, vi } from 'vitest';
import { LocalLoadout } from '../weapons/LocalLoadout';
import { bindRescueActions } from './bindRescueActions';
test('begin/end synchronously clear old actions/queued jump/recoil; tick-only notifications do not clear E or movement; unsubscribe is idempotent', () => {
  const loadout = new LocalLoadout(), actions = { aim: { clear: vi.fn() }, fire: { clear: vi.fn() }, reload: { clear: vi.fn() }, switchInput: { clear: vi.fn() } };
  const keyboard = { consumeJump: vi.fn(() => false) }, recoil = { reset: vi.fn() };
  const unbind = bindRescueActions(loadout, actions, keyboard, recoil);
  loadout.setRescuing(true); expect(actions.fire.clear).toHaveBeenCalledTimes(1); expect(keyboard.consumeJump).toHaveBeenCalledTimes(1);
  for (let tick = 0; tick < 10; tick++) loadout.step({ held: true, pressed: true }, true);
  expect(actions.fire.clear).toHaveBeenCalledTimes(1);
  loadout.setRescuing(false); expect(actions.fire.clear).toHaveBeenCalledTimes(2); expect(recoil.reset).toHaveBeenCalledTimes(2);
  unbind(); unbind(); loadout.setRescuing(true); expect(actions.fire.clear).toHaveBeenCalledTimes(2);
});

test('late binding to an already-active channel clears stale jump/weapon actions immediately', () => {
  const loadout = new LocalLoadout(); loadout.setRescuing(true);
  const clear = vi.fn(), consumeJump = vi.fn(() => true), reset = vi.fn();
  const release = bindRescueActions(loadout, { aim: { clear }, fire: { clear }, reload: { clear }, switchInput: { clear } }, { consumeJump }, { reset });
  expect(clear).toHaveBeenCalledTimes(4); expect(consumeJump).toHaveBeenCalledTimes(1); expect(reset).toHaveBeenCalledTimes(1); release();
});
