import { MATCH_CONFIG, PHYSICS_CONFIG, parseMatchConfig, type MatchConfig, type MatchPhase, type TeamId } from '@bubble-arena/shared';
export interface MatchResult { readonly reason: 'time-limit' | 'score-limit'; readonly winner: TeamId | null; readonly teams: Readonly<Record<TeamId, number>>; readonly endedTick: number }
export interface MatchSnapshot { readonly result: MatchResult | null; readonly phase: MatchPhase; readonly secondsRemaining: number; readonly countdownRemaining: number; readonly revision: number }
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
    this.state = Object.freeze({ result: null, phase: 'waiting', secondsRemaining: this.config.durationSeconds, countdownRemaining: 0, revision: 0 });
  }
  getSnapshot = () => this.state;
  private publish(phase: MatchPhase, secondsRemaining: number, countdownRemaining: number, result: MatchResult | null = this.state.result) {
    if (phase === this.state.phase && secondsRemaining === this.state.secondsRemaining && countdownRemaining === this.state.countdownRemaining) return;
    this.state = Object.freeze({ result, phase, secondsRemaining, countdownRemaining, revision: this.state.revision + 1 });
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
  /** Call once after ALL eliminations/scores for this authority tick have resolved. */
  resolve(tick: number, scores: Readonly<Record<TeamId, number>>) {
    validateTick(tick);
    const teams = validateScores(scores);
    if (this.state.phase !== 'playing' || tick < this.clock) return false;
    if (tick !== this.clock) throw new RangeError('Advance this match tick before resolving');
    const scoreReached = teams.red >= this.config.scoreLimit || teams.blue >= this.config.scoreLimit;
    const timeReached = tick - this.playStart >= this.config.durationSeconds * hz;
    if (!scoreReached && !timeReached) return false;
    const result: MatchResult = Object.freeze({ reason: scoreReached ? 'score-limit' : 'time-limit', winner: teams.red === teams.blue ? null : teams.red > teams.blue ? 'red' : 'blue', teams, endedTick: tick });
    this.publish('finished', this.state.secondsRemaining, 0, result); return true;
  }
  /** Authority finish hook. The end condition is supplied after the whole scoring batch. */
  finish(tick: number) {
    validateTick(tick);
    if (tick < this.clock || this.state.phase !== 'playing') return false;
    this.clock = tick; this.publish('finished', this.state.secondsRemaining, 0); return true;
  }
}
function validateTick(tick: number) { if (!Number.isSafeInteger(tick) || tick < 0) throw new RangeError('Invalid match tick'); }

function validateScores(value: unknown): Readonly<Record<TeamId, number>> {
  if (!value || typeof value !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(value)) || Reflect.ownKeys(value).length !== 2) throw new TypeError('Invalid match scores');
  const teams = {} as Record<TeamId, number>;
  for (const key of ['red', 'blue'] as const) {
    const field = Object.getOwnPropertyDescriptor(value, key);
    if (!field || !('value' in field) || !Number.isSafeInteger(field.value) || field.value < 0) throw new TypeError('Invalid match scores');
    teams[key] = field.value;
  }
  return Object.freeze(teams);
}
