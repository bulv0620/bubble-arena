import { useSyncExternalStore } from 'react';
import { RIFLE_PLACEHOLDER_POSE, WEAPON_PLACEHOLDER_SCALE } from './riflePose';
import type { LocalLoadout } from './LocalLoadout';

// Engineering whitebox, not a Blender asset. Socket is relative to capsule center.
// The weapon uses asset-standard +Z forward; the current whitebox player faces -Z.
const { socket, front } = RIFLE_PLACEHOLDER_POSE;

export function RiflePlaceholder({ loadout }: { loadout: LocalLoadout }) {
  const { active } = useSyncExternalStore(loadout.subscribe, loadout.getSnapshot);
  const colors = { rifle: '#3c8bb5', shotgun: '#dc994e', sniper: '#8e7fc6', bubble: '#65d9cf' };
  return <group name="weapon_socket" position={[socket.x, socket.y, socket.z]} rotation={[0, Math.PI, 0]}>
    <group name={`${active}-placeholder`} scale={[1, 1, WEAPON_PLACEHOLDER_SCALE[active]]}>
      <mesh name="rifle-body" position={[0, 0.13, 0.12]} castShadow receiveShadow>
        <boxGeometry args={[0.18, 0.22, 0.42]} />
        <meshStandardMaterial color={colors[active]} roughness={0.65} />
      </mesh>
      <mesh name="rifle-stock" position={[0, 0.12, -0.18]} castShadow receiveShadow>
        <boxGeometry args={[0.13, 0.16, 0.2]} />
        <meshStandardMaterial color="#25475a" roughness={0.7} />
      </mesh>
      <mesh name="rifle-grip" position={[0, -0.04, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.1, 0.2, 0.12]} />
        <meshStandardMaterial color="#25475a" roughness={0.7} />
      </mesh>
      <mesh name="rifle-barrel" position={[0, 0.15, 0.43]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.07, 0.07, 0.28, 12]} />
        <meshStandardMaterial color="#e9bd5d" roughness={0.6} />
      </mesh>
      <mesh name="rifle-front" position={[0, front.y, front.z]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.045, 0.045, front.depth, 12]} />
        <meshStandardMaterial color="#25475a" roughness={0.7} />
      </mesh>
    </group>
  </group>;
}
