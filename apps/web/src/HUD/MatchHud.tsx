import { useEffect, useRef, useSyncExternalStore } from 'react';
import { MATCH_CONFIG, arenaActorLabel } from '@bubble-arena/shared';
import type { LocalMatch } from '../core/LocalMatch';
import { HudScaleLayer } from './HudScaleLayer';
export function MatchHud({ match, onRestart, arena = false, roomManaged = false, hudScale = 1 }: { hudScale?: number; roomManaged?: boolean; match: LocalMatch; onRestart: () => void; arena?: boolean }) {
  const state = useSyncExternalStore(match.subscribe, match.getSnapshot);
  const resultPanel = useRef<HTMLDivElement>(null);
  useEffect(() => { if (state.phase === 'finished') resultPanel.current?.querySelector<HTMLButtonElement>('button')?.focus(); }, [state.phase]);
  const ready = useSyncExternalStore(match.subscribe, match.isSceneReady);
  const time = `${Math.floor(state.secondsRemaining / 60).toString().padStart(2, '0')}:${(state.secondsRemaining % 60).toString().padStart(2, '0')}`;
  if (state.phase === 'finished' && state.result) {
    const result = state.result;
    const labels: Record<string, string> = { 'training-player': '你', 'training-ally': '测试队友', 'training-enemy-a': arena ? '蓝队 AI' : '模拟敌人 A', 'training-enemy-b': '模拟敌人 B' };
    return <section className="match-results" role="dialog" aria-modal="true" aria-labelledby="match-result-title">
      <div ref={resultPanel} className={`result-card result-${result.winner ?? 'draw'}`} onKeyDown={e => { if (e.key === 'Tab') { e.preventDefault(); resultPanel.current?.querySelector<HTMLButtonElement>('button')?.focus(); } }}><img className="result-mascot" src="/ui/bubble-duel-v2.png" alt="" /><small className="result-eyebrow">BUBBLE ARENA · MATCH RESULTS</small><h1 id="match-result-title">{result.winner === null ? '平局' : result.winner === 'red' ? '红队胜利' : '蓝队胜利'}</h1>
        <p>{result.reason === 'score-limit' ? '达到分数上限' : '比赛时间结束'}</p>
        <div className="result-score"><span className="red">红队 <b>{result.teams.red}</b></span><span>:</span><span className="blue"><b>{result.teams.blue}</b> 蓝队</span></div>
        <table><thead><tr><th>玩家</th><th>队伍</th><th>淘汰</th><th>助攻</th><th>救援</th></tr></thead><tbody>{match.getFinalScores()?.players.map(p => <tr key={p.playerId}><td>{arena ? arenaActorLabel(p.playerId) : labels[p.playerId] ?? p.playerId}</td><td>{p.teamId === 'red' ? '红' : '蓝'}</td><td>{p.eliminations}</td><td>{p.assists}</td><td>{p.rescues}</td></tr>)}</tbody></table>
        <small>这一局，打得漂亮！</small><button className="result-restart" onClick={onRestart}>{roomManaged ? '返回房间 →' : '返回等待区 · 重开比赛'}</button><small>{roomManaged ? '' : '保留地图、当前持枪和设置 · 清空本局记录后重新准备'}</small>
      </div>
    </section>;
  }
  return <><HudScaleLayer scale={hudScale}><section className="combat-clock" aria-label="比赛状态">
    <strong>{state.phase === 'countdown' ? state.countdownRemaining : time}</strong>
    </section></HudScaleLayer>
    {state.phase === 'waiting' && !roomManaged && <section className="match-ready" aria-label="赛前准备">
      <header className="ready-header"><span className="ready-kicker">BUBBLE ARENA / READY?</span><b className="ready-title">来一场<br />泡泡大作战！</b><img src="/ui/bubble-duel-v2.png" alt="" className="ready-emblem" /></header>
      <div className="ready-content"><div className="ready-duel"><span>红队 <b>YOU</b></span><i>VS</i><span>{arena ? '蓝队' : '靶场'} <b>{arena ? 'AI' : '练习'}</b></span></div>
      <span className="ready-subtitle">{arena ? '交叉火线 · 单机 1v1 对抗' : '三靶训练 · 自由练习'}</span>
      <div className="match-preset" role="group" aria-label="比赛预设"><span>选择赛制</span><div className="preset-options">
        <button type="button" aria-pressed={match.rule.config.durationSeconds !== 15 && match.rule.config.scoreLimit !== 1} onClick={() => match.configure(MATCH_CONFIG)}><b>标准赛</b><small>5分钟 · 20分</small></button>
        <button type="button" aria-pressed={match.rule.config.durationSeconds === 15} onClick={() => match.configure({ ...MATCH_CONFIG, durationSeconds: 15 })}><b>速体验</b><small>15秒 · 20分</small></button>
        <button type="button" aria-pressed={match.rule.config.scoreLimit === 1} onClick={() => match.configure({ ...MATCH_CONFIG, scoreLimit: 1 })}><b>一分决胜</b><small>5分钟 · 1分</small></button>
      </div></div><button className="ready-start" disabled={!ready} onClick={match.requestStart}>{ready ? '开始比赛  ▶' : '场景加载中'}</button><small className="ready-tip">淘汰 +1 分 · 击倒后记得补刀</small></div>
    </section>}

  </>;
}
