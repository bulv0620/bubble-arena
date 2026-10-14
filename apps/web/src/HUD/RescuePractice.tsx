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
      <option value="self-rescue">队友救我（先击倒自己）</option>
    </select>
    <small>在身旁放置测试队友，长按 E 救起，恢复50HP和1秒保护；“队友救我”场景在你倒地后自动救援。</small>
  </section>;
}
export function RescueHint({ practice, player }: { practice: LocalRescuePractice; player: LocalPlayerHealth }) {
  const { mode, channel, message } = useSyncExternalStore(practice.subscribe, practice.getSnapshot);
  const status = useSyncExternalStore(player.subscribe, () => player.getSnapshot().status), normal = status === 'normal';
  const receiving = mode === 'self-rescue' && status === 'downed';
  if (mode === 'off' || !normal && !receiving) return null;
  return <aside className={`rescue-hint ${receiving ? 'receiving' : ''}`} aria-live="polite">
    <b>{channel ? receiving ? '队友正在救援你' : '正在救援队友' : '救援练习'}</b>
    {channel ? <><div role="progressbar" aria-label="救援进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(channel.elapsedTicks / channel.requiredTicks * 100)}
      className="rescue-track"><i style={{ width: `${channel.elapsedTicks / channel.requiredTicks * 100}%` }} /></div>
      <span>{(channel.elapsedTicks / PHYSICS_CONFIG.tickRate).toFixed(1)} / {(channel.requiredTicks / PHYSICS_CONFIG.tickRate).toFixed(1)} 秒</span></>
      : <span>{message || (mode === 'self-rescue' ? receiving ? '等待队友救援 · 保持在2米内' : '先在设置中击倒自己 · 队友会尝试救你' : '靠近队友2米内 · 长按 E 救援')}</span>}
    <small>{receiving ? '保持在队友2米内 · 可缓慢移动和观察' : '松键、移动或武器操作会中断 · 鼠标可观察'}</small>
  </aside>;
}
export function RescuePracticeAlly({ practice }: { practice: LocalRescuePractice }) {
  const { ally, allyHealth } = useSyncExternalStore(practice.subscribe, practice.getSnapshot);
  if (!ally || !allyHealth) return null;
  const downed = allyHealth.status === 'downed', hp = downed ? allyHealth.downedHp : allyHealth.hp, maxHp = downed ? allyHealth.maxDownedHp : allyHealth.maxHp;
  const eliminated = allyHealth.status === 'eliminated';
  const label = `测试队友 · ${eliminated ? '淘汰' : downed ? '倒地' : allyHealth.protected ? '保护' : '正常'}`;
  return <group position={[ally.x, ally.y, ally.z]}>
    <BlockAvatar headColor="#d6b182" bodyColor="#79b966" />
    <Html center occlude distanceFactor={OVERHEAD_HEALTH_CONFIG.selfDistanceFactor} position={[0, PLAYER_CONFIG.height / 2 + .25, 0]} zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
      <div className={`overhead-health self ${eliminated ? 'eliminated' : downed ? 'downed' : ''} ${allyHealth.protected ? 'protected' : ''}`} style={{ width: 104 }}><div className="overhead-label"><span>{label}</span><b>{hp}</b></div>
        <div className="health-track" role="meter" aria-label={`测试队友${downed ? '倒地' : ''}生命值`} aria-valuemin={0} aria-valuemax={maxHp} aria-valuenow={hp}><i style={{ width: `${hp / maxHp * 100}%` }} /></div>
      </div>
    </Html>
  </group>;
}
