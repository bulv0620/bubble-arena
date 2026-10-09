import { useSyncExternalStore } from 'react';
import type { LocalLoadout } from '../weapons/LocalLoadout';
import type { RifleMotion } from '../weapons/RifleMotion';
import { reticleProgress } from './reticleProgress';
import { crosshairSize } from './crosshairSize';

export function ReloadProgress({ loadout, motion }: { loadout: LocalLoadout; motion: RifleMotion }) {
  const snapshot = useSyncExternalStore(loadout.subscribe, loadout.getSnapshot);
  const angle = useSyncExternalStore(motion.subscribe, motion.getSnapshot);
  const action = reticleProgress(snapshot);
  if (!action) return null;
  const size = Math.max(88, crosshairSize(angle) + 24);
  return <div className="reload-reticle" role="progressbar" aria-label={action.kind === 'reload' ? '换弹进度' : '击发冷却进度'}
    style={{ width: size, height: size }} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(action.value * 100)}>
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="43" fill="none" stroke="#17364b" strokeWidth="6" opacity="0.65" />
      <circle cx="50" cy="50" r="43" fill="none" stroke="#d7f9ff" strokeWidth="2" opacity="0.45" />
      <circle cx="50" cy="50" r="43" fill="none" stroke={action.kind === 'reload' ? '#80efd6' : '#ffe29c'} strokeWidth="4" strokeLinecap="round"
        pathLength="1" strokeDasharray="1" strokeDashoffset={1 - action.value} transform="rotate(-90 50 50)" />
    </svg><span>{action.label}</span>
  </div>;
}
