import { useSyncExternalStore } from 'react';
import type { PointerLockInput } from '../camera';
import type { FireInput } from './FireInput';
import type { LocalLoadout } from './LocalLoadout';

export function FireInputHint({ input, pointer, loadout }: { input: FireInput; pointer: PointerLockInput; loadout: LocalLoadout }) {
  const fire = useSyncExternalStore(input.subscribe, input.getSnapshot);
  const lock = useSyncExternalStore(pointer.subscribe, pointer.getSnapshot);
  const active = useSyncExternalStore(loadout.subscribe, () => loadout.getSnapshot().active);
  const label = fire.held ? '按住' : fire.pressed ? '单击待处理' : '未按下';
  return <output aria-live="polite" style={{ position: 'absolute', right: 12, bottom: 12,
    pointerEvents: 'none', padding: '8px 12px', background: '#ffffffdd', borderRadius: 8 }}>
    开火意图：{label} · {lock === 'error' || lock === 'unsupported' ? active === 'sniper' ? '后备：右键切镜后左键射击' : '后备：按住右键时左键射击' : '锁定后按左键'}
  </output>;
}
