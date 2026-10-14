import { useSyncExternalStore } from 'react';
import type { LocalTeamScore } from '../player/LocalTeamScore';
import { TRAINING_SCORE_ACTORS } from '@bubble-arena/shared';
import type { LocalPlayerHealth } from '../player/LocalPlayerHealth';
export function TeamScoreHint({ score }: { score: LocalTeamScore }) {
  const state = useSyncExternalStore(score.subscribe, score.getSnapshot);
  return <aside className="hud-panel team-score" aria-label={`队伍比分：红队 ${state.teams.red}，蓝队 ${state.teams.blue}`}>
    <small>TEAM SCORE · 计分练习</small><div className="team-score-row"><span className="red">红队 <b>{state.teams.red}</b></span><span className="versus">:</span><span className="blue"><b>{state.teams.blue}</b> 蓝队</span></div>
    <span className="score-note">击倒不计分 · 淘汰 +1</span>
  </aside>;
}
export function ScorePracticePanel({ score, player }: { score: LocalTeamScore; player: LocalPlayerHealth }) {
  const mode = useSyncExternalStore(player.subscribe, player.getTestSource);
  const replay = useSyncExternalStore(player.subscribe, player.canReplayScore);
  const state = useSyncExternalStore(score.subscribe, score.getSnapshot);
  const labels: Record<string, string> = { [TRAINING_SCORE_ACTORS.player.playerId]: '你 · 红队', [TRAINING_SCORE_ACTORS.ally.playerId]: '测试队友 · 红队',
    [TRAINING_SCORE_ACTORS['enemy-a'].playerId]: '模拟敌人 A · 蓝队', [TRAINING_SCORE_ACTORS['enemy-b'].playerId]: '模拟敌人 B · 蓝队' };
  return <section className="life-test" aria-label="单机计分测试"><b>计分测试 · 模拟伤害来源</b>
    <label htmlFor="damage-source">生命测试伤害来源</label><select id="damage-source" value={mode} onChange={e => player.configureTestSource(e.target.value as typeof mode)}>
      <option value="unowned">未归属 · 不计分</option><option value="enemy-a">模拟敌人 A · 蓝队</option><option value="enemy-b">模拟敌人 B · 蓝队</option>
    </select>
    <small>为受伤/击倒/补刀按钮指定来源。击倒不计分；换另一来源补刀可测试助攻。</small>
    <button disabled={!replay} onClick={() => player.requestTest('replay-score')}>重放上次淘汰</button>
    <div className="score-statistics">{state.players.filter(p => p.playerId !== TRAINING_SCORE_ACTORS.ally.playerId).map(p => <div key={p.playerId}><span>{labels[p.playerId]}</span><b>{p.eliminations} 淘汰 · {p.assists} 助攻</b></div>)}</div>
    <small>模拟来源没有场景人物；重复淘汰不重复得分，重置训练清空比分。</small>
  </section>;
}
