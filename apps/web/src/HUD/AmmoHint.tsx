import { WeaponIcon } from './WeaponIcon';
import { useSyncExternalStore } from 'react';
import { WEAPON_IDS, WEAPON_CONFIGS, WEAPON_HANDLING, weaponSlot, type WeaponSlot } from '@bubble-arena/shared';
import type { LocalLoadout } from '../weapons/LocalLoadout';
export function AmmoHint({ loadout, onSelect, enabled }: { loadout: LocalLoadout; onSelect: (slot: WeaponSlot) => void; enabled: () => boolean }) {
  const { active, lifeStatus, rescuing, matchPlaying } = useSyncExternalStore(loadout.subscribe, loadout.getSnapshot);
  return <nav className="combat-weapons" aria-label="武器快捷栏">{WEAPON_IDS.map(id => {
    const selected = active === id, ammo = loadout.getWeaponAmmo(id), config = WEAPON_CONFIGS[id], slot = weaponSlot(id);
    return <button type="button" key={id} className={`weapon-slot ${selected ? 'active' : ''} ${ammo.magazine === 0 ? 'empty' : ''}`}
      aria-pressed={selected} aria-label={`${slot} · ${WEAPON_HANDLING[id].label} · ${ammo.magazine}发`}
      disabled={!matchPlaying || lifeStatus !== 'normal' || rescuing}
      onMouseDown={event => event.preventDefault()} onClick={event => { if (enabled()) onSelect(slot); event.currentTarget.blur(); }}>
      <kbd>{slot}</kbd><span className={`weapon-art weapon-art-${id}`} aria-hidden="true"><WeaponIcon weapon={id}/></span>
      <span className="slot-ammo"><b>{String(ammo.magazine).padStart(2, '0')}</b></span>
      <span className="slot-pips" aria-hidden="true">{Array.from({ length: config.magazineSize }, (_, i) => <i key={i} className={i < ammo.magazine ? 'filled' : ''} />)}</span>
      <span className="sr-only">{WEAPON_HANDLING[id].label}{ammo.reloading ? '，换弹中' : ''}</span>
    </button>;
  })}</nav>;
}
