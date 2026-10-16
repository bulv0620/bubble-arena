import type { WeaponId } from '@bubble-arena/shared';

export const TRACER_PROFILES = Object.freeze({
  rifle: Object.freeze({ speed: 600, minimumTravel: .06, tailTime: .008, radius: .009, color: '#a6f8ff' }),
  sniper: Object.freeze({ speed: 1000, minimumTravel: .07, tailTime: .01, radius: .013, color: '#e5fcff' }),
  shotgun: Object.freeze({ speed: 700, minimumTravel: .05, tailTime: .003, radius: .005, color: '#c6f4ff' }),
  bubble: null,
});

export function tracerLifetime(distance: number, weapon: WeaponId) {
  const profile = TRACER_PROFILES[weapon];
  return profile && Number.isFinite(distance) && distance > 1e-6
    ? Math.max(profile.minimumTravel, distance / profile.speed) + profile.tailTime : 0;
}

/** Distances along an immutable accepted ray, not a physical projectile. */
export function tracerSegment(distance: number, age: number, weapon: WeaponId) {
  const profile = TRACER_PROFILES[weapon];
  if (!profile || !Number.isFinite(distance) || distance <= 1e-6 || !Number.isFinite(age) || age < 0) return null;
  const travel = Math.max(profile.minimumTravel, distance / profile.speed), lifetime = travel + profile.tailTime;
  if (age >= lifetime) return null;
  const start = distance * Math.max(0, Math.min(1, (age - profile.tailTime) / travel));
  const end = distance * Math.min(1, age / travel);
  return { start, end, opacity: Math.min(1, (lifetime - age) / .025) };
}
