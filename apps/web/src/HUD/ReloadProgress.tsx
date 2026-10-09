import { useSyncExternalStore } from 'react';
import { WEAPON_CONFIGS } from '@bubble-arena/shared';
import type { LocalRifle } from '../weapons';

export function ReloadProgress({ rifle }: { rifle: LocalRifle }) {
  const progress = useSyncExternalStore(rifle.subscribeReload, rifle.getReloadProgress);
  if (progress === null) return null;
  const remaining = (1 - progress) * WEAPON_CONFIGS.rifle.reloadDuration;
  return <div className="reload-reticle" role="progressbar" aria-label="换弹进度"
    aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
    <svg width="88" height="88" viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="43" fill="none" stroke="#17364b" strokeWidth="6" opacity="0.65" />
      <circle cx="50" cy="50" r="43" fill="none" stroke="#d7f9ff" strokeWidth="2" opacity="0.45" />
      <circle cx="50" cy="50" r="43" fill="none" stroke="#80efd6" strokeWidth="4" strokeLinecap="round"
        pathLength="1" strokeDasharray="1" strokeDashoffset={1 - progress} transform="rotate(-90 50 50)" />
    </svg><span>装填 {remaining.toFixed(1)}s</span>
  </div>;
}
