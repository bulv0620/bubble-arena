import { TeamScoreState } from '@bubble-arena/game-core';
import { TRAINING_SCORE_ROSTER, type EliminationFact } from '@bubble-arena/shared';
/** Single training match adapter: subscriptions stay outside the pure rule. */
export class LocalTeamScore {
  private readonly rule = new TeamScoreState(TRAINING_SCORE_ROSTER);
  private readonly listeners = new Set<() => void>();
  getSnapshot = this.rule.getSnapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  beginLife(playerId: string, lifeId: number, tick: number, matchFinished: boolean) { return this.rule.beginLife(playerId, lifeId, tick, matchFinished); }
  step(tick: number, events: readonly EliminationFact[], matchFinished: boolean) {
    const before = this.getSnapshot(), state = this.rule.step(tick, events, matchFinished);
    if (state !== before) {
      if (import.meta.env.DEV) console.info('[score.check]', JSON.stringify({ tick, ...state }));
      for (const listener of this.listeners) listener();
    } return state;
  }
}
