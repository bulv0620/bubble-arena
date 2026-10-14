import { useSyncExternalStore } from 'react';
import { TRAINING_PLAYER_HEALTH_CONFIG } from '@bubble-arena/shared';
import type { LocalPlayerHealth } from '../player/LocalPlayerHealth';

export function PlayerLifeTestPanel({ player }: { player: LocalPlayerHealth }) {
  const state = useSyncExternalStore(player.subscribe, player.getSnapshot);
  const downed = state.status === 'downed';
  return <section className="life-test" aria-label="单机生命测试">
    <b>生命测试 · 单机训练</b>
    <output aria-live="polite">{downed ? `倒地 · 倒地生命 ${state.downedHp} / ${state.maxDownedHp}` : `正常 · HP ${state.hp} / ${state.maxHp}`}</output>
    <div className="settings-actions">
      <button disabled={downed} onClick={() => player.requestTest('hit')}>受伤（{TRAINING_PLAYER_HEALTH_CONFIG.hitDamage}）</button>
      <button disabled={downed} onClick={() => player.requestTest('down')}>击倒测试</button>
    </div>
    <small>倒地后可重置训练，重新测试。</small>
  </section>;
}
