import { useSyncExternalStore } from 'react';
import { TRAINING_PLAYER_HEALTH_CONFIG } from '@bubble-arena/shared';
import type { LocalPlayerHealth } from '../player/LocalPlayerHealth';

export function PlayerLifeTestPanel({ player }: { player: LocalPlayerHealth }) {
  const state = useSyncExternalStore(player.subscribe, player.getSnapshot);
  const downed = state.status === 'downed', eliminated = state.status === 'eliminated';
  return <section className="life-test" aria-label="单机生命测试">
    <b>生命测试 · 单机训练</b>
    <output aria-live="polite">{eliminated ? '已淘汰' : downed ? `倒地 · 倒地生命 ${state.downedHp} / ${state.maxDownedHp} · 剩余 ${state.downedSecondsRemaining} 秒` : `正常 · HP ${state.hp} / ${state.maxHp}`} </output>
    <div className="settings-actions">
      <button disabled={eliminated} onClick={() => player.requestTest('hit')}>{downed ? '补刀' : '受伤'}（{TRAINING_PLAYER_HEALTH_CONFIG.hitDamage}）</button>
      <button disabled={state.status !== 'normal'} onClick={() => player.requestTest('down')}>击倒测试</button>
    </div>
    <small>倒地后可测试补刀；20秒内未被救起会淘汰，重置训练可重新开始。</small>
  </section>;
}
