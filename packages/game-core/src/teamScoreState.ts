import { SCORE_CONFIG, parseScoreRoster, parseEliminationFrame, type DamageActor, type EliminationFact, type ScoreParticipant, type TeamId } from '@bubble-arena/shared';
export interface PlayerScoreLine extends DamageActor { readonly eliminations: number; readonly assists: number; readonly rescues: number }
export interface ScoreResolution { readonly fact: EliminationFact; readonly killer: DamageActor | null; readonly assistant: DamageActor | null; readonly points: number }
export interface TeamScoreSnapshot { readonly revision: number; readonly teams: Readonly<Record<TeamId, number>>; readonly players: readonly PlayerScoreLine[]; readonly lastEvents: readonly ScoreResolution[] }
interface LifeScope { lifeId: number; bornTick: number; scored: boolean }
const increment = (n: number, amount = 1) => { const next = n + amount; if (!Number.isSafeInteger(next)) throw new RangeError('Scoring counter exhausted'); return next; };
/** Fixed match roster includes archived/disconnected actors. Never accept client score claims. */
export class TeamScoreState {
  private readonly roster: readonly ScoreParticipant[];
  private readonly identities: Map<string, ScoreParticipant>;
  private lives: Map<string, LifeScope>;
  private clock = -1;
  private birthClock = -1;
  private readonly rescueScopes = new Map<string, { lifeId: number; revision: number }>();
  private state: TeamScoreSnapshot;
  constructor(roster: readonly ScoreParticipant[]) {
    this.roster = parseScoreRoster(roster); this.identities = new Map(this.roster.map(p => [p.playerId, p]));
    this.lives = new Map(this.roster.map(p => [p.playerId, { lifeId: p.lifeId, bornTick: 0, scored: false }]));
    this.state = Object.freeze({ revision: 0, teams: Object.freeze({ red: 0, blue: 0 }), players: Object.freeze(this.roster.map(p => Object.freeze({ playerId: p.playerId, teamId: p.teamId, eliminations: 0, assists: 0, rescues: 0 }))), lastEvents: Object.freeze([]) });
  }
  getSnapshot = () => this.state;
  /** Authority calls after a successful new-life spawn. Scores remain cumulative. */
  beginLife(playerId: string, lifeId: number, tick: number, matchFinished: boolean) {
    validateTick(tick, matchFinished);
    if (typeof playerId !== 'string' || !Number.isSafeInteger(lifeId) || lifeId < 1) throw new TypeError('Invalid scoring life registration');
    const current = this.lives.get(playerId);
    if (matchFinished || tick < Math.max(this.clock, this.birthClock) || !current || lifeId !== current.lifeId + 1) return false;
    this.lives.set(playerId, { lifeId, bornTick: tick, scored: false }); this.birthClock = tick; return true;
  }
  /** Only the authority invokes this after a successful RescueProgress completion. */
  recordRescue(rescuerId: string, targetId: string, lifeId: number, revision: number, tick: number, matchFinished: boolean) {
    validateTick(tick, matchFinished);
    if (typeof rescuerId !== 'string' || typeof targetId !== 'string' || !Number.isSafeInteger(lifeId) || lifeId < 1 || !Number.isSafeInteger(revision) || revision < 1) throw new TypeError('Invalid rescue score identity');
    const rescuer = this.identities.get(rescuerId), target = this.identities.get(targetId), life = this.lives.get(targetId), previous = this.rescueScopes.get(targetId);
    if (matchFinished || tick < Math.max(this.clock, this.birthClock) || !rescuer || !target || rescuerId === targetId || rescuer.teamId !== target.teamId || life?.lifeId !== lifeId || life.scored || tick < life.bornTick || previous && (lifeId < previous.lifeId || lifeId === previous.lifeId && revision <= previous.revision)) return false;
    const players = this.state.players.map(p => Object.freeze(p.playerId === rescuerId ? { ...p, rescues: increment(p.rescues) } : p));
    const state = Object.freeze({ ...this.state, revision: increment(this.state.revision), players: Object.freeze(players) });
    this.rescueScopes.set(targetId, { lifeId, revision }); this.clock = tick; this.state = state; return true;
  }
  step(tick: number, events: readonly EliminationFact[], matchFinished: boolean) {
    validateTick(tick, matchFinished); const frame = parseEliminationFrame(events);
    if (matchFinished || tick <= this.clock || tick < this.birthClock) return this.state;
    const seen = new Map<string, string>();
    for (const event of frame) {
      if (event.tick > tick) throw new RangeError('Future elimination fact');
      const key = `${event.victim.playerId}/${event.victim.lifeId}`, encoded = JSON.stringify(event), prior = seen.get(key);
      if (prior && prior !== encoded) throw new TypeError('Conflicting same-life elimination facts'); seen.set(key, encoded);
    }
    const lives = new Map([...this.lives].map(([id, life]) => [id, { ...life }]));
    const teams = { ...this.state.teams }, players = this.state.players.map(p => ({ ...p })), lines = new Map(players.map(p => [p.playerId, p]));
    const resolutions: ScoreResolution[] = [];
    const known = (actor: DamageActor | null) => actor === null || this.identities.get(actor.playerId)?.teamId === actor.teamId;
    for (const fact of frame) {
      const life = lives.get(fact.victim.playerId), victim = this.identities.get(fact.victim.playerId);
      if (!life || victim?.teamId !== fact.victim.teamId || life.lifeId !== fact.victim.lifeId || life.scored || fact.tick < life.bornTick || !known(fact.finisher) || !known(fact.downer)) continue;
      life.scored = true;
      const enemy = (actor: DamageActor | null) => actor && actor.playerId !== fact.victim.playerId && actor.teamId !== fact.victim.teamId ? actor : null;
      const killer = fact.cause === 'finishing-damage' ? enemy(fact.finisher) : fact.cause === 'downed-timeout' ? enemy(fact.downer) : null;
      const assistant = killer && fact.cause === 'finishing-damage' && fact.downer?.playerId !== killer.playerId ? enemy(fact.downer) : null;
      const points = killer ? SCORE_CONFIG.eliminationPoints : 0;
      if (killer) { teams[killer.teamId] = increment(teams[killer.teamId], points); const line = lines.get(killer.playerId)!; line.eliminations = increment(line.eliminations); }
      if (assistant) { const line = lines.get(assistant.playerId)!; line.assists = increment(line.assists); }
      resolutions.push(Object.freeze({ fact, killer, assistant, points }));
    }
    const revision = resolutions.length ? increment(this.state.revision) : this.state.revision;
    this.clock = tick;
    if (!resolutions.length) return this.state;
    this.lives = lives;
    this.state = Object.freeze({ revision, teams: Object.freeze(teams), players: Object.freeze(players.map(p => Object.freeze(p))), lastEvents: Object.freeze(resolutions) });
    return this.state;
  }
}
function validateTick(tick: number, finished: boolean) {
  if (!Number.isSafeInteger(tick) || tick < 0) throw new RangeError('Invalid scoring tick');
  if (typeof finished !== 'boolean') throw new TypeError('Expected finished scoring gate');
}
