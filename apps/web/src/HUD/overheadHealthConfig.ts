import { CAMERA_CONFIG } from '@bubble-arena/shared';

// Match the current pixel size at these reference distances; beyond them the
// whole overhead plate follows perspective scale, including labels and damage.
const perspectiveFactor = 2 * Math.tan(CAMERA_CONFIG.fov * Math.PI / 360);
export const OVERHEAD_HEALTH_CONFIG = Object.freeze({
  targetDistanceFactor: 8 * perspectiveFactor,
  selfDistanceFactor: CAMERA_CONFIG.distance * perspectiveFactor,
});
