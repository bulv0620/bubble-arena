import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRapier } from '@react-three/rapier';
import { useRef, useState, useSyncExternalStore } from 'react';
import { Group, Vector3 } from 'three';
import { BUBBLE_TRAP_CONFIG } from '@bubble-arena/shared';
import type { LocalArenaInteractions, PublicBubbleRescue } from '../player/LocalArenaInteractions';
import { isRescueLineClear } from '../player/rescueLineOfSight';
import { OVERHEAD_HEALTH_CONFIG } from './overheadHealthConfig';
import './gameHud.css';
/** Shared scene fact: both teams see the same progress above the trapped target. */
export function BubbleRescueProgress({ interaction }: { interaction: LocalArenaInteractions }) {
  const state = useSyncExternalStore(interaction.subscribe, interaction.getSnapshot);
  return <>{state.rescues.map(rescue => <RescuePlate key={rescue.targetId} rescue={rescue} />)}</>;
}
function RescuePlate({ rescue }: { rescue: PublicBubbleRescue }) {
  const anchor = useRef<Group>(null), content = useRef<HTMLDivElement>(null);
  const [points] = useState(() => ({ eye: new Vector3(), world: new Vector3(), screen: new Vector3() }));
  const { world } = useRapier();
  useFrame(({ camera }) => {
    if (!anchor.current || !content.current) return;
    anchor.current.getWorldPosition(points.world); camera.getWorldPosition(points.eye); points.screen.copy(points.world).project(camera);
    content.current.hidden = Math.abs(points.screen.x) >= 1 || Math.abs(points.screen.y) >= 1 || Math.abs(points.screen.z) >= 1
      || !isRescueLineClear(world, { x: points.eye.x, y: points.eye.y, z: points.eye.z }, { x: points.world.x, y: points.world.y, z: points.world.z });
  });
  return <group ref={anchor} position={[rescue.position.x, rescue.position.y+BUBBLE_TRAP_CONFIG.centerY+BUBBLE_TRAP_CONFIG.radius+.25, rescue.position.z]}>
    <Html center distanceFactor={OVERHEAD_HEALTH_CONFIG.targetDistanceFactor} zIndexRange={[31,0]} style={{ pointerEvents: 'none' }}>
      <div ref={content} hidden className="bubble-rescue-progress" data-rescue-target={rescue.targetId}>
        <b>救援中</b><div role="progressbar" aria-label="水球救援进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(rescue.progress*100)}>
          <i style={{ width: `${rescue.progress*100}%` }} />
        </div>
      </div>
    </Html>
  </group>;
}
