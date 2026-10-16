import { Html } from '@react-three/drei';
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { useFrame } from '@react-three/fiber';
import { useRapier } from '@react-three/rapier';
import { Vector3 } from 'three';
import { isOpponentHealthVisible } from './opponentHealthVisibility';
import { PLAYER_CONFIG, TRAINING_TARGET_CONFIG } from '@bubble-arena/shared';
import type { Group } from 'three';
import type { RefObject } from 'react';
import type { LocalPlayerHealth } from '../player/LocalPlayerHealth';
import type { LocalTrainingTarget } from '../weapons';
import { DAMAGE_NUMBER_CONFIG, type DamageNumbers } from '../effects/DamageNumbers';
import { OVERHEAD_HEALTH_CONFIG } from './overheadHealthConfig';
import './gameHud.css';

function HealthPlate({ label, hp, maxHp, self = false, allied = false, downed = false, protected: protectedState = false, eliminated = false }: { label: string; hp: number; maxHp: number; self?: boolean; allied?: boolean; downed?: boolean; protected?: boolean; eliminated?: boolean }) {
  const ratio = Math.max(0, Math.min(1, hp / maxHp));
  return <div className={`overhead-health ${self ? 'self' : allied ? 'ally' : 'target'} ${ratio <= 0.25 ? 'low' : ''} ${eliminated ? 'eliminated' : downed ? 'downed' : ''} ${protectedState ? 'protected' : ''}`} style={self ? { width: OVERHEAD_HEALTH_CONFIG.selfWidth } : undefined}>
    <div className="overhead-label"><span>{label}</span><b>{hp}</b></div>
    <div role="meter" aria-label={`${label}生命值`} aria-valuemin={0} aria-valuemax={maxHp} aria-valuenow={hp}
      className="health-track"><i style={{ width: `${ratio * 100}%`, background: self ? 'linear-gradient(#c9ff83,#60ce65)' : allied ? 'linear-gradient(#a6e6ff,#3898e8)' : 'linear-gradient(#ffb4ad,#e94d65)' }} /></div>
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
  if(state.status!=='normal')return <group ref={anchor} position={[...OVERHEAD_HEALTH_CONFIG.selfPosition]}/>;
  return <group ref={anchor} position={[...OVERHEAD_HEALTH_CONFIG.selfPosition]}><Html center distanceFactor={OVERHEAD_HEALTH_CONFIG.selfDistanceFactor} zIndexRange={[30, 0]} style={{ pointerEvents: 'none', display: hidden ? 'none' : undefined }}>
    <HealthPlate label={state.protected?'保护':'YOU'} hp={state.hp} maxHp={state.maxHp} self protected={state.protected}/>
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

export function OpponentOverheadHealth({ opponent, allied = false }: { allied?: boolean; opponent: import('../player/LocalArenaOpponent').LocalArenaOpponent }) {
  const state = useSyncExternalStore(opponent.subscribe, opponent.getSnapshot), downed = state.status === 'downed';
  const anchor = useRef<Group>(null), content = useRef<HTMLDivElement>(null);
  const [points] = useState(() => ({ eye: new Vector3(), center: new Vector3(), projected: new Vector3() }));
  const { world } = useRapier();
  useFrame(({ camera }) => {
    if (!anchor.current || !content.current) return;
    anchor.current.getWorldPosition(points.center); camera.getWorldPosition(points.eye);
    points.projected.copy(points.center).project(camera);
    const visible = Math.abs(points.projected.x) < 1 && Math.abs(points.projected.y) < 1 && Math.abs(points.projected.z) < 1 &&
      isOpponentHealthVisible(world, points.eye, points.center, opponent.getSnapshot().status);
    content.current.hidden = !visible;
    opponent.damageNumbers.setVisible(visible && opponent.getSnapshot().status === 'normal');
  });
  return <group ref={anchor}><Html center occlude distanceFactor={OVERHEAD_HEALTH_CONFIG.targetDistanceFactor} position={[0, PLAYER_CONFIG.height / 2 + .38, 0]} zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
    <div ref={content} hidden>
    {downed ? <span className={`bubble-name ${allied?'ally':'enemy'}`}>{opponent.label} · {state.downedSecondsRemaining}s</span> : <>
      <HealthPlate label={state.protected?`${opponent.label} · 保护`:opponent.label} hp={state.hp} maxHp={state.maxHp} allied={allied} protected={state.protected}/>
      <FloatingDamage queue={opponent.damageNumbers}/>
    </>}

    </div>
  </Html></group>;
}
