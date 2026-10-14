import { useEffect, useRef, useSyncExternalStore } from 'react';
import { MATCH_CONFIG } from '@bubble-arena/shared';
import type { LocalMatch } from '../core/LocalMatch';
export function MatchHud({ match, onRestart }: { match: LocalMatch; onRestart: () => void }) {
  const state = useSyncExternalStore(match.subscribe, match.getSnapshot);
  const resultPanel = useRef<HTMLDivElement>(null);
  useEffect(() => { if (state.phase === 'finished') resultPanel.current?.querySelector<HTMLButtonElement>('button')?.focus(); }, [state.phase]);
  const ready = useSyncExternalStore(match.subscribe, match.isSceneReady);
  const time = `${Math.floor(state.secondsRemaining / 60).toString().padStart(2, '0')}:${(state.secondsRemaining % 60).toString().padStart(2, '0')}`;
  if (state.phase === 'finished' && state.result) {
    const result = state.result;
    const labels: Record<string, string> = { 'training-player': '你', 'training-ally': '测试队友', 'training-enemy-a': '模拟敌人 A', 'training-enemy-b': '模拟敌人 B' };
    return <section className="match-results" role="dialog" aria-modal="true" aria-labelledby="match-result-title">
      <div ref={resultPanel} className="result-card" onKeyDown={e => { if (e.key === 'Tab') { e.preventDefault(); resultPanel.current?.querySelector<HTMLButtonElement>('button')?.focus(); } }}><small>BUBBLE ARENA · MATCH RESULTS</small><h1 id="match-result-title">{result.winner === null ? '平局' : result.winner === 'red' ? '红队胜利' : '蓝队胜利'}</h1>
        <p>{result.reason === 'score-limit' ? '达到分数上限' : '比赛时间结束'}</p>
        <div className="result-score"><span className="red">红队 <b>{result.teams.red}</b></span><span>:</span><span className="blue"><b>{result.teams.blue}</b> 蓝队</span></div>
        <table><thead><tr><th>玩家</th><th>队伍</th><th>淘汰</th><th>助攻</th><th>救援</th></tr></thead><tbody>{match.getFinalScores()?.players.map(p => <tr key={p.playerId}><td>{labels[p.playerId] ?? p.playerId}</td><td>{p.teamId === 'red' ? '红' : '蓝'}</td><td>{p.eliminations}</td><td>{p.assists}</td><td>{p.rescues}</td></tr>)}</tbody></table>
        <small>本局已结束 · 移动、伤害、救援和复活已冻结</small><button className="result-restart" onClick={onRestart}>返回等待区 · 重开比赛</button><small>保留地图、主武器和设置 · 清空本局记录后重新准备</small>
      </div>
    </section>;
  }
  return <section className="match-hud hud-panel" aria-label="比赛状态">
    <small>{state.phase === 'waiting' ? '等待开始' : state.phase === 'countdown' ? '准备开始' : state.phase === 'finished' ? '比赛结束' : '比赛进行中'} · {match.rule.config.scoreLimit} 分制</small>
    <strong>{state.phase === 'countdown' ? state.countdownRemaining : time}</strong>
    {state.phase === 'waiting' && <><label className="match-preset">比赛预设<select aria-label="比赛预设" value={match.rule.config.durationSeconds === 15 ? 'time' : match.rule.config.scoreLimit === 1 ? 'score' : 'standard'} onChange={e => match.configure(e.target.value === 'time' ? { ...MATCH_CONFIG, durationSeconds: 15 } : e.target.value === 'score' ? { ...MATCH_CONFIG, scoreLimit: 1 } : MATCH_CONFIG)}>
      <option value="standard">标准 · 5分钟 / 20分</option><option value="time">时间测试 · 15秒 / 20分</option><option value="score">计分测试 · 5分钟 / 1分</option>
    </select></label><button disabled={!ready} onClick={match.requestStart}>{ready ? '开始比赛' : '场景加载中'}</button></>}
  </section>;
}
