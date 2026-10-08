import { useSyncExternalStore } from 'react';
import type { CrosshairInput } from '../input';

export function Crosshair({ input }: { input: CrosshairInput }) {
  const mode = useSyncExternalStore(input.subscribe, input.getSnapshot);
  if (mode === 'hidden') return null;
  const gap = mode === 'aiming' ? 2 : 5;
  const lines = [
    [12, 1, 12, 12 - gap], [12, 12 + gap, 12, 23],
    [1, 12, 12 - gap, 12], [12 + gap, 12, 23, 12],
  ];
  return <svg role="img" aria-label={mode === 'aiming' ? '瞄准准星' : '普通准星'}
    width="24" height="24" viewBox="0 0 24 24" style={{ position: 'absolute', left: '50%', top: '50%',
      transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}>
    <g stroke="#18263a" strokeWidth="3" strokeLinecap="round">
      {lines.map(([x1, y1, x2, y2], i) => <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />)}
    </g>
    <g stroke={mode === 'aiming' ? '#85f6de' : '#ffffff'} strokeWidth="1" strokeLinecap="round">
      {lines.map(([x1, y1, x2, y2], i) => <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />)}
    </g>
    <circle cx="12" cy="12" r="1.5" fill="#ffffff" stroke="#18263a" strokeWidth="0.8" />
  </svg>;
}
