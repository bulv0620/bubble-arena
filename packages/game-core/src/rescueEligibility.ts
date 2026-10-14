import { RESCUE_CONFIG, parseRescueConfig, parseRescueEligibilityFacts, parseRescueTargetId,
  type RescueConfig, type RescueEligibilityFacts, type RescueParticipant, type RescuePosition } from '@bubble-arena/shared';
import { playerActionPolicy } from './playerActionPolicy';

export type RescueRejection = 'finished' | 'no-target' | 'target-missing' | 'target-mismatch' | 'self'
  | 'disconnected' | 'unassigned-team' | 'enemy' | 'rescuer-state' | 'target-state'
  | 'airborne' | 'target-busy' | 'out-of-range' | 'blocked';
export interface RescueIdentity { readonly playerId: string; readonly lifeId: number; readonly revision: number }
export type RescueEligibility = Readonly<{ eligible: false; reason: RescueRejection }>
  | Readonly<{ eligible: true; distance: number; rescuer: RescueIdentity; target: RescueIdentity }>;
export type RescueVisibilityQuery = (from: RescuePosition, to: RescuePosition) => boolean;
const reject = (reason: RescueRejection): RescueEligibility => Object.freeze({ eligible: false, reason });
const identity = (player: RescueParticipant): RescueIdentity => Object.freeze({ playerId: player.playerId, lifeId: player.life.lifeId, revision: player.life.revision });

/** Stateless eligibility only. The authority supplies current facts and map query;
 * no reservation, progress, health change or client-supplied success is accepted. */
export function evaluateRescueEligibility(requestedTargetId: string | null, facts: RescueEligibilityFacts,
  isUnobstructed: RescueVisibilityQuery, config: RescueConfig = RESCUE_CONFIG): RescueEligibility {
  const requested = parseRescueTargetId(requestedTargetId), current = parseRescueEligibilityFacts(facts), tuning = parseRescueConfig(config);
  if (typeof isUnobstructed !== 'function') throw new TypeError('Expected authoritative rescue map query');
  const { rescuer, target } = current;
  if (current.matchFinished) return reject('finished');
  if (requested === null) return reject('no-target');
  if (target === null) return reject('target-missing');
  if (target.playerId !== requested) return reject('target-mismatch');
  if (rescuer.playerId === target.playerId) return reject('self');
  if (!rescuer.connected || !target.connected) return reject('disconnected');
  if (rescuer.teamId === null || target.teamId === null) return reject('unassigned-team');
  if (rescuer.teamId !== target.teamId) return reject('enemy');
  if (!playerActionPolicy(rescuer.life.status).canRescue) return reject('rescuer-state');
  if (target.life.status !== 'downed') return reject('target-state');
  if (!rescuer.grounded) return reject('airborne');
  if (current.targetRescuerId !== null && current.targetRescuerId !== rescuer.playerId) return reject('target-busy');
  const distance = Math.hypot(target.position.x - rescuer.position.x, target.position.y - rescuer.position.y, target.position.z - rescuer.position.z);
  if (!Number.isFinite(distance) || distance > tuning.maxDistance) return reject('out-of-range');
  const clear = isUnobstructed(rescuer.position, target.position);
  if (typeof clear !== 'boolean') throw new TypeError('Invalid rescue map query result');
  if (!clear) return reject('blocked');
  return Object.freeze({ eligible: true, distance, rescuer: identity(rescuer), target: identity(target) });
}
