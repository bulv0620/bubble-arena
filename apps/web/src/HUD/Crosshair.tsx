import { useSyncExternalStore } from 'react';
import type { CrosshairInput } from '../input';

export function Crosshair({ input }: { input: CrosshairInput }) {
  const mode = useSyncExternalStore(input.subscribe, input.getSnapshot);
  if (mode === 'hidden') return null;
  const size = mode === 'aiming' ? 52 : 64;
  return <svg role="img" aria-label={mode === 'aiming' ? '瞄准准星' : '普通准星'}
    width={size} height={size} viewBox="0 0 64 64" style={{ position: 'absolute', left: '50%', top: '50%',
      transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}>
    <circle cx="32" cy="32" r="26" fill="none" stroke="#18263a" strokeWidth="3.5"
      strokeDasharray="32 8.84" transform="rotate(10 32 32)" opacity="0.65" />
    <circle cx="32" cy="32" r="26" fill="none" stroke={mode === 'aiming' ? '#85f6de' : '#ffffff'}
      strokeWidth="1.5" strokeDasharray="32 8.84" transform="rotate(10 32 32)" />
    <circle cx="32" cy="32" r="2" fill="#ffffff" stroke="#18263a" strokeWidth="1" />
  </svg>;
}
