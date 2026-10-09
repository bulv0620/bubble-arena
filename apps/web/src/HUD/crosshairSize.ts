import { RIFLE_SPREAD_CONFIG } from '@bubble-arena/shared';
/** Readable spread hint, not an exact screen-space guarantee for muzzle parallax. */
export function crosshairSize(angle: number) {
  if (!Number.isFinite(angle)) return 36;
  return Math.max(36, Math.min(112, Math.round(36 + (angle - RIFLE_SPREAD_CONFIG.normal) * 180 / Math.PI * 28)));
}
