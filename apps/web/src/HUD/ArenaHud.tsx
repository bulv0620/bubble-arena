import { useSyncExternalStore } from 'react';
import { ARENA_CONFIG, ARENA_SOLIDS, WHITEBOX_SOLIDS, WHITEBOX_CONFIG, TRAINING_TARGET_LAYOUT } from '@bubble-arena/shared';
import type { ArenaTelemetry } from '../player/ArenaTelemetry';
export function ArenaHud({ telemetry, arena }: { telemetry: ArenaTelemetry; arena: boolean }) {
  const map = useSyncExternalStore(telemetry.subscribe, telemetry.getSnapshot);
  return <aside className="combat-minimap" aria-label={arena ? '竞技场小地图' : '训练场小地图'}>
    {arena ? <ArenaMap map={map} /> : <svg viewBox={`${map.player.x - 20} ${map.player.z - 20} 40 40`} role="img" aria-label="训练场地图">
      <rect x={-WHITEBOX_CONFIG.groundSize / 2} y={-WHITEBOX_CONFIG.groundSize / 2} width={WHITEBOX_CONFIG.groundSize} height={WHITEBOX_CONFIG.groundSize} fill="#193948" fillOpacity=".34" />
      {WHITEBOX_SOLIDS.map(s => <rect key={s.id} x={s.position[0] - s.size[0] / 2} y={s.position[2] - s.size[2] / 2} width={s.size[0]} height={s.size[2]} fill={s.kind === 'wall' ? '#dfebee' : '#b4cdd0'} fillOpacity=".65" />)}
      {TRAINING_TARGET_LAYOUT.map(t => <circle key={t.id} cx={t.position[0]} cy={t.position[2]} r="1" fill="#ffd968" />)}
      <circle cx={map.player.x} cy={map.player.z} r="1.7" fill="#ff7971" stroke="white" strokeWidth=".6" />
    </svg>}
  </aside>;
}
export function ArenaMap({ map }: { map: ReturnType<ArenaTelemetry['getSnapshot']> }) {
  const x = (v: number) => v + ARENA_CONFIG.width / 2, z = (v: number) => v + ARENA_CONFIG.length / 2;
  return <svg viewBox="0 0 48 56" role="img" aria-label="三路地图：红蓝复活区、掩体与高台">
    <rect width="48" height="56" fill="#193948" fillOpacity=".34" /><rect x="1" y="1" width="46" height="8" fill="#70cbff" fillOpacity=".28" /><rect x="1" y="47" width="46" height="8" fill="#ff8e85" fillOpacity=".28" />
    {ARENA_SOLIDS.filter(s => s.kind !== 'wall').map(s => <rect key={s.id} x={x(s.position[0] - s.size[0] / 2)} y={z(s.position[2] - s.size[2] / 2)} width={s.size[0]} height={s.size[2]} fill={s.kind === 'cover' ? '#ebd5a8' : s.kind === 'ramp' || s.kind === 'deck' ? '#a6d5cf' : '#cfdee4'} fillOpacity=".65" />)}
    <circle cx={x(map.player.x)} cy={z(map.player.z)} r="1.25" fill={map.playerTeam === 'red' ? '#ff7971' : '#59c6ff'} stroke="white" strokeWidth=".4" />
    {map.actors.map(actor=><circle key={actor.id} cx={x(actor.position.x)} cy={z(actor.position.z)} r="1.1" fill={actor.team==='red'?'#ff7971':'#59c6ff'} stroke="white" strokeWidth=".4" />)}
  </svg>;
}
