import type { AimVector } from '../weapons';
import { WEAPON_CONFIGS, WEAPON_IDS, type WeaponId } from '@bubble-arena/shared';
import { tracerLifetime } from './tracerSegment';
export const SHOT_EFFECT_CONFIG = Object.freeze({ muzzleDuration: .06, impactDuration: .16, muzzleRadius: .18, impactRadius: .055,
  pelletCapacity: 16, pelletImpactDuration: .14, pelletImpactRadius: .03 });
export interface PelletVisual { readonly point: AimVector; readonly hit: boolean }
export interface ShotVisual { readonly sequence: number; readonly weapon?: WeaponId; readonly muzzle: AimVector; readonly impact: AimVector | null; readonly pellets?: readonly PelletVisual[] }
const EMPTY_PELLETS: readonly PelletVisual[] = Object.freeze([]);
const finite = (p: AimVector) => p && [p.x, p.y, p.z].every(Number.isFinite);
/** Bounded presentation state: one muzzle and one impact, no timers or physics. */
export class ShotFeedback {
  private lastSequence = 0;
  private event: ShotVisual | null = null;
  private age = Infinity;
  private listeners = new Set<(event: ShotVisual) => void>();
  subscribe(listener: (event: ShotVisual) => void) {
    this.listeners.add(listener); return () => { this.listeners.delete(listener); };
  }
  emit(event: ShotVisual) {
    if (!event || !Number.isSafeInteger(event.sequence) || event.sequence <= 0 || !finite(event.muzzle)
      || event.impact !== null && !finite(event.impact) || event.weapon !== undefined && !WEAPON_IDS.includes(event.weapon)) throw new TypeError('Invalid shot visual');
    if (event.pellets !== undefined && (!Array.isArray(event.pellets) || event.pellets.length > SHOT_EFFECT_CONFIG.pelletCapacity
      || event.pellets.some(pellet => !pellet || !finite(pellet.point) || typeof pellet.hit !== 'boolean'))) throw new TypeError('Invalid pellet visuals');
    if (event.sequence <= this.lastSequence) return false;
    this.lastSequence = event.sequence;
    this.event = Object.freeze({ sequence: event.sequence, weapon: event.weapon ?? 'rifle', muzzle: Object.freeze({ ...event.muzzle }),
      impact: event.impact ? Object.freeze({ ...event.impact }) : null,
      ...(event.pellets ? { pellets: Object.freeze(event.pellets.map(pellet => Object.freeze({ point: Object.freeze({ ...pellet.point }), hit: pellet.hit }))) } : {}) });
    this.age = 0;
    for (const listener of this.listeners) listener(this.event);
    return true;
  }
  step(dt: number) {
    if (Number.isFinite(dt) && dt > 0) this.age += dt;
    return { muzzle: this.age < SHOT_EFFECT_CONFIG.muzzleDuration ? this.event?.muzzle ?? null : null,
      impact: this.age < SHOT_EFFECT_CONFIG.impactDuration ? this.event?.impact ?? null : null };
  }
  clear() { this.event = null; this.age = Infinity; }
  getMuzzleState() {
    return { weapon: this.event?.weapon ?? 'rifle', active: Boolean(this.event && this.age < SHOT_EFFECT_CONFIG.muzzleDuration),
      strength: Math.max(0, 1 - this.age / SHOT_EFFECT_CONFIG.muzzleDuration) };
  }
  getPelletState() {
    const weapon = this.event?.weapon ?? 'rifle', duration = tracerLifetime(WEAPON_CONFIGS[weapon].range, weapon);
    return { origin: this.event?.muzzle ?? null, weapon, age: this.age,
      pellets: this.age < Math.max(duration, SHOT_EFFECT_CONFIG.pelletImpactDuration) ? this.event?.pellets ?? EMPTY_PELLETS : EMPTY_PELLETS,
      showTraces: this.age < duration, showImpacts: this.age < SHOT_EFFECT_CONFIG.pelletImpactDuration };
  }
}
