import { parseTeamId, type TeamId } from './team';
export interface DamageActor { readonly playerId: string; readonly teamId: TeamId }
export interface ScoreParticipant extends DamageActor { readonly lifeId: number }
export interface EliminationFact {
  readonly tick: number;
  readonly victim: ScoreParticipant;
  readonly cause: 'finishing-damage' | 'downed-timeout' | 'environment' | 'suicide';
  readonly finisher: DamageActor | null;
  readonly downer: DamageActor | null;
}
export const SCORE_CONFIG = Object.freeze({ eliminationPoints: 1, playerCapacity: 8, frameCapacity: 8 });
function record(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
    || Reflect.ownKeys(value).length !== keys.length || keys.some(k => { const f = Object.getOwnPropertyDescriptor(value, k); return !f || !('value' in f); })) throw new TypeError('Invalid score data');
  return value as Record<string, unknown>;
}
function id(value: unknown): string {
  if (typeof value !== 'string' || value.length < 1 || value.length > 64 || /\s/u.test(value) || Array.from(value).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) throw new TypeError('Invalid combatant ID'); return value;
}
export function parseDamageActor(value: unknown): DamageActor {
  const data = record(value, ['playerId', 'teamId']); return Object.freeze({ playerId: id(data.playerId), teamId: parseTeamId(data.teamId) });
}
export function parseScoreParticipant(value: unknown): ScoreParticipant {
  const data = record(value, ['playerId', 'teamId', 'lifeId']);
  if (typeof data.lifeId !== 'number' || !Number.isSafeInteger(data.lifeId) || data.lifeId < 1) throw new RangeError('Invalid scoring life');
  return Object.freeze({ playerId: id(data.playerId), teamId: parseTeamId(data.teamId), lifeId: data.lifeId });
}
export function parseEliminationFact(value: unknown): EliminationFact {
  const data = record(value, ['tick', 'victim', 'cause', 'finisher', 'downer']);
  if (typeof data.tick !== 'number' || !Number.isSafeInteger(data.tick) || data.tick < 0) throw new RangeError('Invalid elimination tick');
  if (!['finishing-damage', 'downed-timeout', 'environment', 'suicide'].includes(data.cause as string)) throw new TypeError('Invalid elimination cause');
  const finisher = data.finisher === null ? null : parseDamageActor(data.finisher), downer = data.downer === null ? null : parseDamageActor(data.downer);
  if (data.cause !== 'finishing-damage' && finisher !== null) throw new TypeError('Only finishing damage can carry a finisher');
  return Object.freeze({ tick: data.tick, victim: parseScoreParticipant(data.victim), cause: data.cause as EliminationFact['cause'], finisher, downer });
}
function array(value: unknown, maximum: number): unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > maximum || Reflect.ownKeys(value).length !== value.length + 1) throw new TypeError('Invalid score list');
  for (let i = 0; i < value.length; i++) { const f = Object.getOwnPropertyDescriptor(value, String(i)); if (!f || !('value' in f)) throw new TypeError('Invalid score element'); } return value;
}
export function parseScoreRoster(value: unknown): readonly ScoreParticipant[] {
  const seen = new Set<string>(), players = array(value, SCORE_CONFIG.playerCapacity).map(parseScoreParticipant);
  if (!players.length) throw new RangeError('Empty scoring roster');
  for (const p of players) { if (seen.has(p.playerId)) throw new TypeError('Duplicate scoring player'); seen.add(p.playerId); } return Object.freeze(players);
}
export function parseEliminationFrame(value: unknown): readonly EliminationFact[] { return Object.freeze(array(value, SCORE_CONFIG.frameCapacity).map(parseEliminationFact)); }
