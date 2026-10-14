import type { LocalTeamScore } from './LocalTeamScore';
import { PlayerHealthState, type RescueChannel } from '@bubble-arena/game-core';
import { TRAINING_PLAYER_HEALTH_CONFIG, TRAINING_RESCUE_CONFIG, PLAYER_LIFE_CONFIG, RESCUE_PROTECTION_CONFIG, RESPAWN_CONFIG, TRAINING_DAMAGE_SOURCES, TRAINING_SCORE_ACTORS, type TrainingDamageSource, type EliminationFact } from '@bubble-arena/shared';

export type HealthTestIntent = 'hit' | 'down' | 'replay-score';
/** Bounded local test input and subscriptions; damage is consumed by a physics hook. */
export class LocalPlayerHealth {
  private readonly rule = new PlayerHealthState(1, PLAYER_LIFE_CONFIG, RESCUE_PROTECTION_CONFIG, RESPAWN_CONFIG, TRAINING_SCORE_ACTORS.player);
  private source: TrainingDamageSource = 'unowned';
  private lastObserved: EliminationFact | null = null;
  private lastResolved: EliminationFact | null = null;
  constructor(private readonly score?: LocalTeamScore, readonly canPlay: () => boolean = () => true) {}
  getTestSource = () => this.source;
  canReplayScore = () => this.lastResolved !== null;
  configureTestSource = (source: TrainingDamageSource) => {
    if (!TRAINING_DAMAGE_SOURCES.includes(source)) throw new TypeError('Invalid training damage source');
    if (source === this.source) return; this.source = source; for (const listener of this.listeners) listener();
  };
  private readonly listeners = new Set<() => void>();
  private pending: { kind: HealthTestIntent; source: TrainingDamageSource } | null = null;
  private tick = 0;
  private sequence = 0;
  private damageRevision = 0;
  getDamageRevision = () => this.damageRevision;
  getTick = () => this.tick - 1;
  getSnapshot = this.rule.getSnapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  requestTest = (intent: HealthTestIntent) => {
    if (intent !== 'hit' && intent !== 'down' && intent !== 'replay-score') throw new TypeError('Invalid health test intent');
    if (!this.canPlay()) return false;
    const status = this.getSnapshot().status;
    if (this.pending !== null) return false;
    if (intent === 'replay-score') { if (!this.lastResolved) return false; }
    else if ((status !== 'normal' && status !== 'downed') || intent === 'down' && status !== 'normal') return false;
    this.pending = { kind: intent, source: this.source }; return true;
  };
  clearPending = () => { this.pending = null; };
  completeSpawn(apply: () => boolean) {
    if (!this.canPlay()) return false;
    const before = this.getSnapshot();
    const accepted = this.rule.completeSpawn({ lifeId: before.lifeId, revision: before.revision }, this.getTick(), apply, false);
    if (accepted) { this.pending = null; this.lastObserved = null; this.score?.beginLife(TRAINING_SCORE_ACTORS.player.playerId, this.getSnapshot().lifeId, this.getTick(), false); }
    if (this.getSnapshot() !== before) for (const listener of this.listeners) listener();
    return accepted;
  }
  completeRescue(channel: RescueChannel) {
    if (!this.canPlay()) return false;
    if (channel.target.playerId !== TRAINING_RESCUE_CONFIG.playerId) return false;
    const before = this.getSnapshot();
    const accepted = this.rule.completeRescue({ lifeId: channel.target.lifeId, revision: channel.target.revision, elapsedTicks: channel.elapsedTicks }, this.getTick(), false);
    if (this.getSnapshot() !== before) for (const listener of this.listeners) listener();
    return accepted;
  }
  onAcceptedFire(sequence: number) {
    if (!this.canPlay()) return false;
    const before = this.getSnapshot();
    const ended = this.rule.onAcceptedFire({ lifeId: before.lifeId, revision: before.revision, tick: this.getTick(), sequence }, false);
    if (this.getSnapshot() !== before) for (const listener of this.listeners) listener();
    return ended;
  }
  canCauseControl = () => this.canPlay() && (this.getTick() < 0 || this.rule.canCauseControl(this.getTick(), false));
  step() {
    if (!this.canPlay()) { this.pending = null; return false; }
    const tick = this.tick++;
    const before = this.getSnapshot();
    const intent = this.pending; this.pending = null;
    let accepted = false;
    const events: EliminationFact[] = [];
    if (intent?.kind === 'replay-score' && this.lastResolved) events.push(this.lastResolved);
    else if (intent) {
      const damage = intent.kind === 'hit' ? TRAINING_PLAYER_HEALTH_CONFIG.hitDamage : TRAINING_PLAYER_HEALTH_CONFIG.downDamage;
      const actor = intent.source === 'unowned' ? null : TRAINING_SCORE_ACTORS[intent.source];
      accepted = this.rule.receiveDamage({ lifeId: this.getSnapshot().lifeId, tick, sequence: ++this.sequence }, damage, false, actor);
      if (accepted) this.damageRevision++;
    }
    this.rule.advanceTick(tick, false);
    const elimination = this.rule.getElimination();
    if (elimination && elimination !== this.lastObserved) { this.lastObserved = elimination; this.lastResolved = elimination; events.push(elimination); }
    this.score?.step(tick, events, false);
    if (intent?.kind === 'replay-score' && import.meta.env.DEV) console.info('[score.replay]', JSON.stringify({ tick, lifeId: this.getSnapshot().lifeId, replayLifeId: this.lastResolved?.victim.lifeId, score: this.score?.getSnapshot() }));
    if (this.getSnapshot() !== before) for (const listener of this.listeners) listener();
    return accepted;
  }
}
