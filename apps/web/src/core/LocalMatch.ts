import { MatchState, type TeamScoreSnapshot } from '@bubble-arena/game-core';
import { MATCH_CONFIG, type MatchConfig } from '@bubble-arena/shared';
/** Local authority only; formal room readiness will be supplied by the server. */
export class LocalMatch {
  rule: MatchState;
  private finalScores: TeamScoreSnapshot | null = null;
  private tick = -1;
  private pending = false;
  private sceneReady = false;
  private readonly listeners = new Set<() => void>();
  constructor(readonly enabled = true, config: MatchConfig = MATCH_CONFIG) { this.rule = new MatchState(config); }
  getSnapshot = () => this.rule.getSnapshot();
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getFinalScores = () => this.finalScores;
  configure(config: MatchConfig) {
    if (this.getSnapshot().phase !== 'waiting') return false;
    const rule = new MatchState(config); this.pending = false; this.rule = rule; this.notify(); return true;
  }
  resolve(scores: TeamScoreSnapshot) {
    if (!this.enabled || this.tick < 0 || !this.rule.resolve(this.tick, scores.teams)) return false;
    this.finalScores = scores; this.notify();
    if (import.meta.env.DEV) console.info('[match.finished]', JSON.stringify({ ...this.getSnapshot(), players: scores.players }));
    return true;
  }
  canPlay = () => !this.enabled || this.getSnapshot().phase === 'playing';
  isSceneReady = () => this.sceneReady;
  setSceneReady(value: boolean) { this.sceneReady = value; if (!value) this.pending = false; this.notify(); }
  requestStart = () => { if (!this.sceneReady || this.getSnapshot().phase !== 'waiting') return false; this.pending = true; return true; };
  private notify() { for (const listener of this.listeners) listener(); }
  step() {
    const before = this.getSnapshot(), tick = ++this.tick;
    if (this.pending) { this.pending = false; this.rule.start(tick, this.sceneReady); }
    this.rule.advance(tick);
    if (before !== this.getSnapshot()) this.notify();
  }
}
