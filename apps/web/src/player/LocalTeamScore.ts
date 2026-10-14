import { TeamScoreState } from '@bubble-arena/game-core';
import { TRAINING_SCORE_ROSTER, type EliminationFact } from '@bubble-arena/shared';
/** Single training match adapter: subscriptions stay outside the pure rule. */
export class LocalTeamScore {
  private readonly rule = new TeamScoreState(TRAINING_SCORE_ROSTER);
  private readonly listeners = new Set<() => void>();
  constructor(private readonly canPlay: () => boolean = () => true) {}
  getSnapshot = this.rule.getSnapshot;
  recordRescue(rescuerId: string, targetId: string, lifeId: number, revision: number, tick: number) {
    const accepted = this.rule.recordRescue(rescuerId, targetId, lifeId, revision, tick, !this.canPlay());
    if (accepted) for (const listener of this.listeners) listener(); return accepted;
  }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  beginLife(playerId: string, lifeId: number, tick: number, matchFinished: boolean) { return this.rule.beginLife(playerId, lifeId, tick, matchFinished || !this.canPlay()); }
  step(tick: number, events: readonly EliminationFact[], matchFinished: boolean) {
    const before = this.getSnapshot(), state = this.rule.step(tick, events, matchFinished || !this.canPlay());
    if (state !== before) {
      if (import.meta.env.DEV) console.info('[score.check]', JSON.stringify({ tick, ...state }));
      for (const listener of this.listeners) listener();
    } return state;
  }
}
