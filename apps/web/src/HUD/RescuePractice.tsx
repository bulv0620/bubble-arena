import { useSyncExternalStore } from 'react';
import { Html } from '@react-three/drei';
import { PLAYER_CONFIG, PHYSICS_CONFIG, type TrainingRescueMode } from '@bubble-arena/shared';
import { BlockAvatar } from '../visuals';
import type { LocalPlayerHealth } from '../player/LocalPlayerHealth';
import type { LocalRescuePractice } from '../player/LocalRescuePractice';
import { OVERHEAD_HEALTH_CONFIG } from './overheadHealthConfig';
export function RescuePracticePanel({ practice }: { practice: LocalRescuePractice }) {
  const mode = useSyncExternalStore(practice.subscribe, () => practice.getSnapshot().mode);
  return <section className="life-test" aria-label="单机救援练习">
    <label htmlFor="rescue-mode">救援练习 · 单机测试</label>
    <select id="rescue-mode" value={mode} onChange={event => practice.configure(event.target.value as TrainingRescueMode)}>
      <option value="off">关闭</option><option value="stationary">静止倒地队友</option>
      <option value="crawl-away">队友在救援中向外爬行</option><option value="injury">救援1秒后受到伤害</option>
    </select>
    <small>在身旁放置测试队友，靠近后长按 E。当前验证3秒进度，队友保持倒地。</small>
  </section>;
}
export function RescueHint({ practice, player }: { practice: LocalRescuePractice; player: LocalPlayerHealth }) {
  const { mode, channel, message } = useSyncExternalStore(practice.subscribe, practice.getSnapshot);
  const normal = useSyncExternalStore(player.subscribe, () => player.getSnapshot().status === 'normal');
  if (mode === 'off' || !normal) return null;
  return <aside className="rescue-hint" aria-live="polite">
    <b>{channel?.ready ? '救援进度测试完成' : channel ? '正在救援队友' : '救援练习'}</b>
    {channel ? <><div role="progressbar" aria-label="救援进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(channel.elapsedTicks / channel.requiredTicks * 100)}
      className="rescue-track"><i style={{ width: `${channel.elapsedTicks / channel.requiredTicks * 100}%` }} /></div>
      <span>{(channel.elapsedTicks / PHYSICS_CONFIG.tickRate).toFixed(1)} / {(channel.requiredTicks / PHYSICS_CONFIG.tickRate).toFixed(1)} 秒</span></>
      : <span>{message || '靠近队友2米内 · 长按 E 救援'}</span>}
    <small>松键、移动或武器操作会中断 · 鼠标可观察</small>
  </aside>;
}
export function RescuePracticeAlly({ practice }: { practice: LocalRescuePractice }) {
  const ally = useSyncExternalStore(practice.subscribe, () => practice.getSnapshot().ally);
  if (!ally) return null;
  return <group position={[ally.x, ally.y, ally.z]}>
    <BlockAvatar headColor="#d6b182" bodyColor="#79b966" />
    <Html center occlude distanceFactor={OVERHEAD_HEALTH_CONFIG.selfDistanceFactor} position={[0, PLAYER_CONFIG.height / 2 + .25, 0]} zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
      <div className="overhead-health self downed" style={{ width: 104 }}><div className="overhead-label"><span>测试队友 · 倒地</span><b>{practice.getAllyHp()}</b></div>
        <div className="health-track" role="meter" aria-label="测试队友倒地生命值" aria-valuemin={0} aria-valuemax={practice.getAllyHp()} aria-valuenow={practice.getAllyHp()}><i style={{ width: '100%' }} /></div>
      </div>
    </Html>
  </group>;
}
