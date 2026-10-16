import { useSyncExternalStore } from 'react';
import { arenaActorLabel } from '@bubble-arena/shared';
import type { ScoreboardInput } from '../input/ScoreboardInput';
import type { LocalTeamScore } from '../player/LocalTeamScore';
import type { ArenaTelemetry } from '../player/ArenaTelemetry';
import { ArenaMap } from './ArenaHud';
export function Scoreboard({ input, score, telemetry }: { input: ScoreboardInput; score: LocalTeamScore; telemetry: ArenaTelemetry }) {
  const held = useSyncExternalStore(input.subscribe, input.getSnapshot), state = useSyncExternalStore(score.subscribe, score.getSnapshot), map = useSyncExternalStore(telemetry.subscribe, telemetry.getSnapshot);
  if (!held) return null;
  return <section className="held-scoreboard" aria-label="对局记分板"><div className="scoreboard-map"><ArenaMap map={map}/></div><div className="scoreboard-table">
    {(['blue', 'red'] as const).map(team => <div key={team} className={`scoreboard-team ${team}`}><h2>{team === 'blue' ? '蓝队' : '红队'}<b>{String(state.teams[team]).padStart(2,'0')}</b></h2>
      <table><colgroup><col className="scoreboard-player-column"/><col className="scoreboard-stat-column" span={3}/></colgroup><thead><tr><th scope="col">玩家</th><th scope="col">淘汰</th><th scope="col">助攻</th><th scope="col">救援</th></tr></thead><tbody>{state.players.filter(p=>p.teamId===team).map(p=><tr key={p.playerId}><td title={arenaActorLabel(p.playerId)}>{arenaActorLabel(p.playerId)}</td><td>{p.eliminations}</td><td>{p.assists}</td><td>{p.rescues}</td></tr>)}</tbody></table></div>)}
  </div></section>;
}
