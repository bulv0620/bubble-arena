import { useSyncExternalStore } from 'react';
import { WEAPON_CONFIGS } from '@bubble-arena/shared';
import type { LocalRifle } from '../weapons';
export function AmmoHint({ rifle }: { rifle: LocalRifle }) {
  const ammo = useSyncExternalStore(rifle.subscribe, rifle.getSnapshot);
  const reserveLabel = rifle.infiniteReserve ? '∞' : String(ammo.reserve);
  return <output className={`hud-panel weapon-ammo ${ammo.magazine <= 5 ? 'low-ammo' : ''}`}
    aria-label={`步枪弹药：${ammo.magazine} / ${rifle.infiniteReserve ? '无限备弹' : reserveLabel}`}>
    <div className="weapon-title"><span>01</span> 泡泡步枪 <small>RIFLE</small></div>
    <div className="ammo-body"><svg viewBox="0 0 100 44" width="100" height="44" aria-hidden="true">
      <path d="M6 14H19V9H54L61 15H89V20H64V25H49L46 38H36L38 25H19L8 32Z" fill="#a4e3fa" />
      <path d="M24 6H48M61 18H96" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    </svg><b>{String(ammo.magazine).padStart(2, '0')}</b><span>/ {reserveLabel}</span></div>
    <div className="ammo-pips" aria-hidden="true">{Array.from({ length: WEAPON_CONFIGS.rifle.magazineSize }, (_, i) =>
      <i key={i} className={i < ammo.magazine ? 'filled' : ''} />)}</div>
    <div className="weapon-action">{ammo.reloading ? `装填中 · ${WEAPON_CONFIGS.rifle.reloadDuration}s` : ammo.magazine === 0 ? '弹匣已空 · 按 R 装填' : '按 R 装填'}</div>
  </output>;
}
