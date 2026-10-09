import { WEAPON_CONFIGS } from '@bubble-arena/shared';
import type { LoadoutSnapshot } from '../weapons/LocalLoadout';
/** One display decision for both actions; last-shot auto reload has priority. */
export function reticleProgress(snapshot: LoadoutSnapshot) {
  if (snapshot.progress !== null) return { kind: 'reload' as const, value: snapshot.progress,
    label: `装填 ${((1 - snapshot.progress) * WEAPON_CONFIGS[snapshot.active].reloadDuration).toFixed(1)}s` };
  if (snapshot.cooldownProgress !== null) return { kind: 'cooldown' as const, value: snapshot.cooldownProgress, label: '冷却' };
  return null;
}
