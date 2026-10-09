import { useSyncExternalStore } from 'react';
import type { LocalLoadout } from '../weapons/LocalLoadout';
export function FireCooldownProgress({ loadout }: { loadout: LocalLoadout }) {
  const { cooldownProgress, cooldownRemaining, progress, active } = useSyncExternalStore(loadout.subscribe, loadout.getSnapshot);
  if (cooldownProgress === null) return null;
  return <div className={`fire-cooldown ${progress !== null ? 'reloading' : ''}`} role="progressbar" aria-label="击发冷却进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(cooldownProgress * 100)}>
    <span>{progress !== null ? '击发冷却 · 装填中' : active === 'sniper' ? '准备下一发 · 冷却后可开镜' : '准备下一发'} <b>{cooldownRemaining.toFixed(1)}s</b></span>
    <div><i style={{ width: `${cooldownProgress * 100}%` }} /></div>
  </div>;
}
