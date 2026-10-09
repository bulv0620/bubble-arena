import { useSyncExternalStore } from 'react';
import type { AimInput } from './AimInput';

export function AimHint({ input }: { input: AimInput }) {
  const aiming = useSyncExternalStore(input.subscribe, input.getSnapshot);
  return <output aria-live="polite" className={`aim-mode ${aiming ? 'precise' : ''}`}>
    {aiming ? '◎ 精确射击 · 低速 / 收束' : '○ 自由射击 · 右键收束'}
  </output>;
}
