import { useSyncExternalStore } from 'react';
import { WEAPON_CONFIGS, WEAPON_HANDLING } from '@bubble-arena/shared';
import type { LocalLoadout } from '../weapons/LocalLoadout';
export function AmmoHint({ loadout }: { loadout: LocalLoadout }) {
  const { active, primary, ammo, lifeStatus, rescuing } = useSyncExternalStore(loadout.subscribe, loadout.getSnapshot);
  const config = WEAPON_CONFIGS[active], label = WEAPON_HANDLING[active].label;
  const reserveLabel = loadout.infiniteReserve ? '∞' : String(ammo.reserve);
  return <output className={`hud-panel weapon-ammo ${ammo.magazine <= Math.max(1, Math.floor(config.magazineSize / 6)) ? 'low-ammo' : ''}`}
    aria-label={`${label}弹药：${ammo.magazine} / ${loadout.infiniteReserve ? '无限备弹' : reserveLabel}`}>
    <div className="weapon-title"><span>{active === 'bubble' ? '02' : '01'}</span> {label} <small>{active.toUpperCase()}</small></div>
    <div className="ammo-body"><svg viewBox="0 0 100 44" width="100" height="44" aria-hidden="true">
      <path d="M6 14H19V9H54L61 15H89V20H64V25H49L46 38H36L38 25H19L8 32Z" fill="#a4e3fa" />
      <path d="M24 6H48M61 18H96" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    </svg><b>{String(ammo.magazine).padStart(2, '0')}</b><span>/ {reserveLabel}</span></div>
    <div className="ammo-pips" aria-hidden="true">{Array.from({ length: config.magazineSize }, (_, i) =>
      <i key={i} className={i < ammo.magazine ? 'filled' : ''} />)}</div>
    <div className="weapon-action">{rescuing ? '救援中 · 武器暂停' : lifeStatus !== 'normal' ? '倒地 · 武器不可用' : ammo.reloading ? `装填中 · ${config.reloadDuration}s` : ammo.magazine === 0 ? '弹匣已空 · 按 R 装填' : '按 R 装填'}</div>
    <div className="weapon-slots"><span className={active !== 'bubble' ? 'selected' : ''}>1 · {WEAPON_HANDLING[primary].label}</span><span className={active === 'bubble' ? 'selected' : ''}>2 · 泡泡</span></div>
    <small className="weapon-weight">重量 {WEAPON_HANDLING[active].weight} · 移速 {loadout.getSpeed().toFixed(1)} m/s</small>
  </output>;
}
