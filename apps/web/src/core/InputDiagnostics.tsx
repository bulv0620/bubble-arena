import { useEffect, useSyncExternalStore } from 'react';
import type { KeyboardInput } from '../player';

export function InputDiagnostics({ input }: { input: KeyboardInput }) {
  const keys = useSyncExternalStore(input.subscribe, input.getSnapshot);
  useEffect(() => input.subscribe(() => {
    console.info('[input.check]', JSON.stringify(input.getSnapshot()));
  }), [input]);
  return (
    <output aria-label="键盘输入状态" style={{
      position: 'absolute', top: 12, left: 12, padding: '8px 12px',
      background: '#ffffffdd', borderRadius: 8, pointerEvents: 'none', fontSize: 14,
    }}>
      WASD 输入 · W:{Number(keys.forward)} A:{Number(keys.left)} S:{Number(keys.backward)} D:{Number(keys.right)}
      <br />本步只读取输入，玩家保持静止
    </output>
  );
}
