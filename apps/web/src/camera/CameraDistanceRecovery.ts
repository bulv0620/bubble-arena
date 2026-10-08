import { CAMERA_CONFIG } from '@bubble-arena/shared';

interface RecoveryPlan { distance: number; delay: number }

/** Scalar presentation state. Commit only after the candidate passes geometry validation. */
export class CameraDistanceRecovery {
  private current: RecoveryPlan | null = null;

  preview(safeDistance: number, dt: number): RecoveryPlan | null {
    if (!Number.isFinite(safeDistance) || safeDistance < 0) return null;
    if (!this.current) return { distance: safeDistance, delay: 0 };
    if (safeDistance <= this.current.distance) {
      return { distance: safeDistance, delay: CAMERA_CONFIG.recoveryDelay };
    }
    const elapsed = Number.isFinite(dt) && dt > 0 ? Math.min(dt, CAMERA_CONFIG.recoveryMaxDelta) : 0;
    const recoveringTime = Math.max(0, elapsed - this.current.delay);
    const delay = Math.max(0, this.current.delay - elapsed);
    let distance = this.current.distance + (safeDistance - this.current.distance)
      * (1 - Math.exp(-CAMERA_CONFIG.recoveryResponse * recoveringTime));
    if (recoveringTime > 0 && safeDistance - distance <= CAMERA_CONFIG.recoveryEpsilon) distance = safeDistance;
    return { distance: Math.min(safeDistance, distance), delay };
  }

  commit(plan: RecoveryPlan) { this.current = { ...plan }; }
  reset() { this.current = null; }
}
