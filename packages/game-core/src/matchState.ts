import { MATCH_CONFIG, PHYSICS_CONFIG, parseMatchConfig, type MatchConfig, type MatchPhase } from '@bubble-arena/shared';
export interface MatchSnapshot { readonly phase: MatchPhase; readonly secondsRemaining: number; readonly countdownRemaining: number; readonly revision: number }
const hz = Math.round(1 / PHYSICS_CONFIG.timeStep);
/** No render timers or transport. Authority starts only after validating readiness. */
export class MatchState {
  readonly config: MatchConfig;
  private clock = -1;
  private deadline = 0;
  private playStart = 0;
  private state: MatchSnapshot;
  constructor(config: MatchConfig = MATCH_CONFIG) {
    this.config = parseMatchConfig(config);
    this.state = Object.freeze({ phase: 'waiting', secondsRemaining: this.config.durationSeconds, countdownRemaining: 0, revision: 0 });
  }
  getSnapshot = () => this.state;
  private publish(phase: MatchPhase, secondsRemaining: number, countdownRemaining: number) {
    if (phase === this.state.phase && secondsRemaining === this.state.secondsRemaining && countdownRemaining === this.state.countdownRemaining) return;
    this.state = Object.freeze({ phase, secondsRemaining, countdownRemaining, revision: this.state.revision + 1 });
  }
  start(tick: number, allReady: boolean) {
    validateTick(tick);
    if (typeof allReady !== 'boolean') throw new TypeError('Invalid ready gate');
    if (!allReady || tick < this.clock || this.state.phase !== 'waiting') return false;
    const deadline = tick + this.config.countdownSeconds * hz;
    if (!Number.isSafeInteger(deadline + this.config.durationSeconds * hz)) throw new RangeError('Match deadline exhausted');
    this.clock = tick; this.deadline = deadline;
    this.publish('countdown', this.config.durationSeconds, this.config.countdownSeconds); return true;
  }
  advance(tick: number) {
    validateTick(tick);
    if (tick <= this.clock || this.state.phase === 'finished') return this.state;
    this.clock = tick;
    if (this.state.phase === 'countdown') {
      if (tick >= this.deadline) { this.playStart = this.deadline; this.publish('playing', Math.max(0, this.config.durationSeconds - Math.floor((tick - this.playStart) / hz)), 0); }
      else this.publish('countdown', this.config.durationSeconds, Math.ceil((this.deadline - tick) / hz));
    } else if (this.state.phase === 'playing') this.publish('playing', Math.max(0, this.config.durationSeconds - Math.floor((tick - this.playStart) / hz)), 0);
    return this.state;
  }
  /** Authority finish hook. The end condition is supplied after the whole scoring batch. */
  finish(tick: number) {
    validateTick(tick);
    if (tick < this.clock || this.state.phase !== 'playing') return false;
    this.clock = tick; this.publish('finished', this.state.secondsRemaining, 0); return true;
  }
}
function validateTick(tick: number) { if (!Number.isSafeInteger(tick) || tick < 0) throw new RangeError('Invalid match tick'); }
