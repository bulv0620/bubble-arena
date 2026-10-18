import { useReticleSize } from './useReticleSize';
import { useSyncExternalStore } from 'react';
import { WEAPON_HANDLING } from '@bubble-arena/shared';
import type { RifleMotion } from '../weapons';
import type { LocalLoadout } from '../weapons/LocalLoadout';
import type { CrosshairInput } from '../input';

export function Crosshair({ input, motion, loadout }: { input: CrosshairInput; motion: RifleMotion; loadout: LocalLoadout }) {
  const mode = useSyncExternalStore(input.subscribe, input.getSnapshot);
  const angle = useSyncExternalStore(motion.subscribe, motion.getSnapshot);
  const size = useReticleSize(angle);
  const { active, scoped, lifeStatus, rescuing, sprinting, muzzleBlocked } = useSyncExternalStore(loadout.subscribe, loadout.getSnapshot);
  const moving = angle > WEAPON_HANDLING[active].spread.normal;
  if (mode === 'hidden' || lifeStatus !== 'normal' || rescuing) return null;
  if(sprinting)return <svg className="sprint-reticle" role="img" aria-label="奔跑中无法射击" viewBox="0 0 48 48"><circle cx="24" cy="24" r="13" fill="#142f4633" stroke="#d7f3ff" strokeWidth="2"/><path d="M15 33L33 15" stroke="#ffb784" strokeWidth="3"/></svg>;
  if (scoped) return <div className="sniper-scope" role="img" aria-label={muzzleBlocked ? '狙击镜准星，枪口被遮挡' : '狙击镜准星'}><div className="scope-lens"><i className="scope-horizontal" /><i className="scope-vertical" /><b style={muzzleBlocked ? { color: '#ffb568' } : undefined}>{muzzleBlocked ? '×' : '+'}</b></div></div>;
  if (muzzleBlocked) return <div className="muzzle-blocked" role="img" aria-label="枪口被遮挡">×</div>;
  return <svg role="img" aria-label={moving ? '散布扩大准星' : '普通准星'}
    width={size} height={size} viewBox="0 0 64 64" style={{ position: 'absolute', left: '50%', top: '50%',
      transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}>
    <circle cx="32" cy="32" r="26" fill="none" stroke="#18263a" strokeWidth="3.5" vectorEffect="non-scaling-stroke"
      strokeDasharray="32 8.84" transform="rotate(10 32 32)" opacity="0.65" />
    <circle cx="32" cy="32" r="26" fill="none" stroke={moving ? '#ffe6a0' : '#ffffff'}
      strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeDasharray="32 8.84" transform="rotate(10 32 32)" />
    <circle cx="32" cy="32" r={1.25*64/size} fill="#ffffff" stroke="#18263a" strokeWidth={64/size} />
  </svg>;
}
