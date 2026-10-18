import { useSyncExternalStore, type RefObject } from 'react';
import type { Group } from 'three';
import type { WeaponId } from '@bubble-arena/shared';
import { RIFLE_PLACEHOLDER_POSE, WEAPON_PLACEHOLDER_SCALE } from './riflePose';
import type { LocalLoadout } from './LocalLoadout';
const { socket, front } = RIFLE_PLACEHOLDER_POSE;
/** Engineering toy whitebox only. The static tip and query socket share one transform. */
export function ToyWeapon({ weapon, muzzleAnchor }: { weapon: WeaponId; muzzleAnchor?: RefObject<Group | null> }) {
  const color = { rifle:'#36b5ec', shotgun:'#ffad4b', sniper:'#9a83df', bubble:'#5bded0' }[weapon];
  return <group name="weapon_socket" position={[socket.x,socket.y,socket.z]} rotation={[0,Math.PI,0]}>
    <group name={`${weapon}-placeholder`} scale={[1,1,WEAPON_PLACEHOLDER_SCALE[weapon]]}>
      <mesh position={[0,.13,.12]} castShadow><boxGeometry args={[.2,.23,.42]}/><meshToonMaterial color={color}/></mesh>
      <mesh position={[0,.13,-.18]} castShadow><boxGeometry args={[.17,.18,.2]}/><meshToonMaterial color="#b3e8ef"/></mesh>
      <mesh position={[0,-.04,0]} rotation={[-.2,0,0]} castShadow><boxGeometry args={[.12,.22,.13]}/><meshToonMaterial color={color}/></mesh>
      <mesh position={[.104,.14,.12]}><boxGeometry args={[.012,.13,.27]}/><meshToonMaterial color="#fff9dc"/></mesh>
      <mesh position={[0,.15,.43]} rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[.09,.09,.28,10]}/><meshToonMaterial color="#ffe18b"/></mesh>
      <mesh position={[0,front.y,front.z]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.055,.055,front.depth,10]}/><meshToonMaterial color="#285477"/></mesh>
      {weapon === 'rifle' && <mesh position={[0,.32,.1]} rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[.13,.13,.24,12]}/><meshToonMaterial color="#81e8ff"/></mesh>}
      {weapon === 'shotgun' && <mesh position={[0,.02,.42]} rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[.085,.085,.29,10]}/><meshToonMaterial color="#ffcc66"/></mesh>}
      {weapon === 'sniper' && <mesh position={[0,.33,.12]} rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[.075,.09,.24,12]}/><meshToonMaterial color="#b7eaf9"/></mesh>}
      {weapon === 'bubble' && <mesh position={[0,.29,.15]} castShadow><sphereGeometry args={[.22,16,12]}/><meshToonMaterial color="#8be9ff"/></mesh>}
      <group ref={muzzleAnchor} name="muzzle" userData={{ weapon }} position={[0, front.y, front.z + front.depth / 2]} />
    </group>
  </group>;
}
export function RiflePlaceholder({ loadout, muzzleAnchor }: { loadout: LocalLoadout; muzzleAnchor: RefObject<Group | null> }) {
  const { active } = useSyncExternalStore(loadout.subscribe,loadout.getSnapshot);
  return <ToyWeapon weapon={active} muzzleAnchor={muzzleAnchor}/>;
}
