import { expect, test } from 'vitest';
import { LocalLoadout } from '../weapons/LocalLoadout';
import { reticleProgress } from './reticleProgress';
const idle = { held: false, pressed: false }, press = { held: true, pressed: true };
test.each(['shotgun', 'sniper', 'bubble'] as const)('%s last shot selects only reload, while prior shots select cooldown with exactly one word', id => {
  const loadout = new LocalLoadout(id === 'bubble' ? 'rifle' : id);
  if (id === 'bubble') loadout.select(4);
  expect(reticleProgress(loadout.getSnapshot())).toBeNull();
  loadout.step(press); expect(reticleProgress(loadout.getSnapshot())).toEqual({ kind: 'cooldown', value: 0, label: '冷却' });
  while (loadout.getSnapshot().ammo.magazine > 0) {
    while (loadout.getSnapshot().cooldownProgress !== null) loadout.step(idle);
    loadout.step(press);
  }
  expect(loadout.getSnapshot().cooldownProgress).not.toBeNull(); expect(loadout.getSnapshot().progress).toBe(0);
  expect(reticleProgress(loadout.getSnapshot())).toMatchObject({ kind: 'reload', value: 0 });
  while (loadout.getSnapshot().ammo.reloading) {
    loadout.step(idle);
    if (loadout.getSnapshot().ammo.reloading) expect(reticleProgress(loadout.getSnapshot())?.kind).toBe('reload');
  }
  expect(reticleProgress(loadout.getSnapshot())).toBeNull();
});
test('manual reload overrides active cooldown immediately; switching reads actual selected weapon progress', () => {
  const loadout = new LocalLoadout('sniper'); loadout.step(press); loadout.step(idle, true);
  expect(reticleProgress(loadout.getSnapshot())?.kind).toBe('reload');
  loadout.select(4); expect(reticleProgress(loadout.getSnapshot())).toBeNull();
  loadout.select(3); expect(reticleProgress(loadout.getSnapshot())).toMatchObject({ kind: 'cooldown', label: '冷却' });
  expect(reticleProgress(new LocalLoadout('sniper').getSnapshot())).toBeNull();
});
