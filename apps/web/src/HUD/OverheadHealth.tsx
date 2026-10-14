import { Html } from '@react-three/drei';
import { useEffect, useSyncExternalStore, type CSSProperties } from 'react';
import { PLAYER_CONFIG, TRAINING_TARGET_CONFIG } from '@bubble-arena/shared';
import type { Group } from 'three';
import type { RefObject } from 'react';
import type { LocalPlayerHealth } from '../player/LocalPlayerHealth';
import type { LocalTrainingTarget } from '../weapons';
import { DAMAGE_NUMBER_CONFIG, type DamageNumbers } from '../effects/DamageNumbers';
import { OVERHEAD_HEALTH_CONFIG } from './overheadHealthConfig';
import './gameHud.css';

function HealthPlate({ label, hp, maxHp, self = false, downed = false, protected: protectedState = false }: { label: string; hp: number; maxHp: number; self?: boolean; downed?: boolean; protected?: boolean }) {
  const ratio = Math.max(0, Math.min(1, hp / maxHp));
  return <div className={`overhead-health ${self ? 'self' : 'target'} ${ratio <= 0.25 ? 'low' : ''} ${downed ? 'downed' : ''} ${protectedState ? 'protected' : ''}`} style={self ? { width: OVERHEAD_HEALTH_CONFIG.selfWidth } : undefined}>
    <div className="overhead-label"><span>{label}</span><b>{hp}</b></div>
    <div role="meter" aria-label={`${label}生命值`} aria-valuemin={0} aria-valuemax={maxHp} aria-valuenow={hp}
      className="health-track"><i style={{ width: `${ratio * 100}%` }} /></div>
  </div>;
}
function FloatingDamage({ queue }: { queue: DamageNumbers }) {
  const entries = useSyncExternalStore(queue.subscribe, queue.getSnapshot);
  useEffect(() => () => queue.clear(), [queue]);
  return <div className="damage-cloud" aria-hidden="true">{entries.map(entry => <span key={entry.id}
    className="damage-number" data-damage-id={entry.id} onAnimationEnd={() => queue.remove(entry.id)}
    style={{ '--damage-x': `${entry.x}px`, '--damage-y': `${entry.y}px`,
      '--damage-rise': `${DAMAGE_NUMBER_CONFIG.rise}px`, animationDuration: `${DAMAGE_NUMBER_CONFIG.durationMs}ms` } as CSSProperties}>
    −{entry.damage}
  </span>)}</div>;
}
export function PlayerOverheadHealth({ player, hidden = false, anchor }: { player: LocalPlayerHealth; hidden?: boolean; anchor: RefObject<Group | null> }) {
  const state = useSyncExternalStore(player.subscribe, player.getSnapshot);
  const downed = state.status === 'downed';
  return <group ref={anchor} position={[...OVERHEAD_HEALTH_CONFIG.selfPosition]}><Html center distanceFactor={OVERHEAD_HEALTH_CONFIG.selfDistanceFactor} zIndexRange={[30, 0]} style={{ pointerEvents: 'none', display: hidden ? 'none' : undefined }}>
    <HealthPlate label={downed ? "倒地" : state.protected ? "保护" : "YOU"} hp={downed ? state.downedHp : state.hp} maxHp={downed ? state.maxDownedHp : state.maxHp} self downed={downed} protected={state.protected} />
  </Html></group>;
}
export function TargetOverheadHealth({ target, label }: { target: LocalTrainingTarget; label: string }) {
  const state = useSyncExternalStore(target.subscribe, target.getSnapshot);
  const slow = useSyncExternalStore(target.subscribe, target.getSlowSnapshot);
  return <Html center occlude distanceFactor={OVERHEAD_HEALTH_CONFIG.targetDistanceFactor} position={[0, PLAYER_CONFIG.height / 2 + 0.38, 0]} zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
    <HealthPlate label={state.hp === 0 ? `${label} · ${TRAINING_TARGET_CONFIG.restoreDuration}s恢复` : label} hp={state.hp} maxHp={state.maxHp} />
    <FloatingDamage queue={target.damageNumbers} />
    {slow < 1 && <span className="target-slow">减速 50%</span>}
  </Html>;
}
