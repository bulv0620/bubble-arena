import { useSyncExternalStore } from 'react';
import type { PointerLockInput } from '../camera';
import type { FireInput } from './FireInput';

export function FireInputHint({ input, pointer }: { input: FireInput; pointer: PointerLockInput }) {
  const fire = useSyncExternalStore(input.subscribe, input.getSnapshot);
  const lock = useSyncExternalStore(pointer.subscribe, pointer.getSnapshot);
  const label = fire.held ? '按住' : fire.pressed ? '单击待处理' : '未按下';
  return <output aria-live="polite" style={{ position: 'absolute', right: 12, bottom: 12,
    pointerEvents: 'none', padding: '8px 12px', background: '#ffffffdd', borderRadius: 8 }}>
    开火意图：{label} · {lock === 'error' || lock === 'unsupported' ? '后备：右键瞄准时按左键' : '锁定后按左键'}
  </output>;
}
