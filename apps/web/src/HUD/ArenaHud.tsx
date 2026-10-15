import { useSyncExternalStore } from 'react';
import { ARENA_CONFIG, ARENA_SOLIDS } from '@bubble-arena/shared';
import type { ArenaTelemetry } from '../player/ArenaTelemetry';
import type { LocalArenaOpponent } from '../player/LocalArenaOpponent';
export function ArenaHud({ telemetry, opponent }: { telemetry: ArenaTelemetry; opponent: LocalArenaOpponent }) {
  const map = useSyncExternalStore(telemetry.subscribe, telemetry.getSnapshot), enemy = useSyncExternalStore(opponent.subscribe, opponent.getSnapshot);
  const x = (v: number) => v + ARENA_CONFIG.width / 2, z = (v: number) => v + ARENA_CONFIG.length / 2;
  return <aside className="arena-hud hud-panel" aria-label="竞技场小地图">
    <small>ARENA 01 · CROSSFIRE</small><b>交叉火线</b><span>你 · 红队 vs 蓝队 AI</span>
    <svg viewBox="0 0 48 56" role="img" aria-label="三路地图：左路、中庭、右侧高台，红蓝两端复活区">
      <rect width="48" height="56" rx="2" fill="#ede7d6" /><rect x="1" y="1" width="46" height="8" fill="#8bb9d4" /><rect x="1" y="47" width="46" height="8" fill="#d99d93" />
      {ARENA_SOLIDS.filter(s => s.kind !== 'wall').map(s => <rect key={s.id} x={x(s.position[0] - s.size[0] / 2)} y={z(s.position[2] - s.size[2] / 2)} width={s.size[0]} height={s.size[2]} fill={s.kind === 'cover' ? '#b19b6a' : s.kind === 'ramp' || s.kind === 'deck' ? '#a9bcae' : '#6e8290'} />)}
      <text x="24" y="6" textAnchor="middle">BLUE</text><text x="24" y="53" textAnchor="middle">RED</text>
      <circle cx={x(map.player.x)} cy={z(map.player.z)} r="1.2" fill="#f1534d" stroke="white" strokeWidth=".4" />
      {enemy.status !== 'eliminated' && enemy.status !== 'respawning' && <circle cx={x(map.enemy.x)} cy={z(map.enemy.z)} r="1.2" fill="#278cc3" stroke="white" strokeWidth=".4" />}
    </svg>
    <div className="arena-lanes"><span>左路 · 近战</span><span>中庭</span><span>高台 · 1.5m</span></div>
    <span className="arena-enemy-status">蓝队 AI：{enemy.status === 'normal' ? `${enemy.hp} HP` : enemy.status === 'downed' ? `倒地 ${enemy.downedHp} HP` : `复活 ${enemy.respawnSecondsRemaining}s`}</span>
  </aside>;
}
