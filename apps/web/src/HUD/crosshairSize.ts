import { CAMERA_CONFIG, RIFLE_SPREAD_CONFIG } from '@bubble-arena/shared';
export const RETICLE_LAYOUT = Object.freeze({ minimum:36, viewBox:64, circleRadius:26, maxHeightFraction:.9 });
/** Project the actual cone, plus a readable minimum ring; never apply HUD scaling. */
export function crosshairSize(angle: number,height=720,fov=CAMERA_CONFIG.fov) {
  if (![angle,height,fov].every(Number.isFinite) || angle<0 || height<=0 || fov<=0 || fov>=180) return RETICLE_LAYOUT.minimum;
  const focal=height/(2*Math.tan(fov*Math.PI/360));
  const radius=RETICLE_LAYOUT.minimum*RETICLE_LAYOUT.circleRadius/RETICLE_LAYOUT.viewBox
    +focal*(Math.tan(Math.min(angle,Math.PI/2-.001))-Math.tan(RIFLE_SPREAD_CONFIG.normal));
  return Math.max(RETICLE_LAYOUT.minimum,Math.min(height*RETICLE_LAYOUT.maxHeightFraction,
    Math.ceil(radius*RETICLE_LAYOUT.viewBox/RETICLE_LAYOUT.circleRadius)));
}
