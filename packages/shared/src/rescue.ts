import { PLAYER_LIFE_STATUSES, type PlayerLifeSnapshot } from './playerLife';

export interface RescueConfig { readonly maxDistance: number }
export type RescueTeamId = 'red' | 'blue';
export interface RescuePosition { readonly x: number; readonly y: number; readonly z: number }
/** Authoritative simulation facts, never a client player/coordinate payload. */
export interface RescueParticipant {
  readonly playerId: string;
  readonly teamId: RescueTeamId | null;
  readonly life: PlayerLifeSnapshot;
  readonly position: RescuePosition;
  readonly grounded: boolean;
  readonly connected: boolean;
}
export interface RescueEligibilityFacts {
  readonly rescuer: RescueParticipant;
  /** The authority's lookup of the requested target. Null means no such player. */
  readonly target: RescueParticipant | null;
  /** Current authoritative owner of this target's rescue, if any. */
  readonly targetRescuerId: string | null;
  readonly matchFinished: boolean;
}
function record(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new TypeError('Expected rescue data object');
  const fields = Reflect.ownKeys(value);
  if (fields.length !== keys.length || fields.some(key => typeof key !== 'string' || !keys.includes(key)
    || !('value' in Object.getOwnPropertyDescriptor(value, key)!))) throw new TypeError('Invalid rescue data fields');
  return value as Record<string, unknown>;
}
function playerId(value: unknown): string {
  if (typeof value !== 'string' || value.length < 1 || value.length > 64 || (/\s/u.test(value) || Array.from(value).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127))) throw new TypeError('Invalid rescue player identity');
  return value;
}
/** Only the selection intent; it does not authorize or identify a life transition. */
export function parseRescueTargetId(value: unknown): string | null { return value === null ? null : playerId(value); }
export function parseRescueConfig(value: unknown): RescueConfig {
  const data = record(value, ['maxDistance']);
  if (typeof data.maxDistance !== 'number' || !Number.isFinite(data.maxDistance) || data.maxDistance <= 0) throw new RangeError('Invalid rescue distance');
  return Object.freeze({ maxDistance: data.maxDistance });
}
export const RESCUE_CONFIG = parseRescueConfig({ maxDistance: 2 });
export function parseRescuePosition(value: unknown): RescuePosition {
  const data = record(value, ['x', 'y', 'z']);
  for (const key of ['x', 'y', 'z']) if (typeof data[key] !== 'number' || !Number.isFinite(data[key])) throw new RangeError('Invalid rescue position');
  return Object.freeze({ x: data.x, y: data.y, z: data.z }) as RescuePosition;
}
function participant(value: unknown): RescueParticipant {
  const data = record(value, ['playerId', 'teamId', 'life', 'position', 'grounded', 'connected']);
  const id = playerId(data.playerId);
  if (data.teamId !== null && data.teamId !== 'red' && data.teamId !== 'blue') throw new TypeError('Invalid rescue team');
  if (typeof data.grounded !== 'boolean' || typeof data.connected !== 'boolean') throw new TypeError('Expected rescue simulation flags');
  const life = record(data.life, ['status', 'lifeId', 'revision']);
  if (!PLAYER_LIFE_STATUSES.includes(life.status as PlayerLifeSnapshot['status'])) throw new TypeError('Invalid rescue life status');
  if (typeof life.lifeId !== 'number' || !Number.isSafeInteger(life.lifeId) || life.lifeId < 1
    || typeof life.revision !== 'number' || !Number.isSafeInteger(life.revision) || life.revision < 0) throw new RangeError('Invalid rescue life identity');
  return Object.freeze({ playerId: id, teamId: data.teamId, life: Object.freeze({ ...life }) as unknown as PlayerLifeSnapshot,
    position: parseRescuePosition(data.position), grounded: data.grounded, connected: data.connected });
}
export function parseRescueEligibilityFacts(value: unknown): RescueEligibilityFacts {
  const data = record(value, ['rescuer', 'target', 'targetRescuerId', 'matchFinished']);
  if (typeof data.matchFinished !== 'boolean') throw new TypeError('Expected rescue finished gate');
  return Object.freeze({ rescuer: participant(data.rescuer), target: data.target === null ? null : participant(data.target),
    targetRescuerId: parseRescueTargetId(data.targetRescuerId), matchFinished: data.matchFinished });
}
