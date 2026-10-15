import { useEffect, useMemo } from 'react';
import { CanvasTexture, SRGBColorSpace } from 'three';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { ARENA_CONFIG as config, ARENA_SOLIDS, COLLISION_GROUPS, COLLIDER_MATERIALS } from '@bubble-arena/shared';
function Sign({ text, position, color, rotation = 0 }: { text: string; position: [number, number, number]; color: string; rotation?: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
    const c = canvas.getContext('2d')!; c.fillStyle = color; c.fillRect(0, 0, 512, 128); c.strokeStyle = '#ffffff80'; c.lineWidth = 8; c.strokeRect(8, 8, 496, 112);
    c.fillStyle = 'white'; c.font = 'bold 42px sans-serif'; c.textAlign = 'center'; c.fillText(text, 256, 80);
    const t = new CanvasTexture(canvas); t.colorSpace = SRGBColorSpace; return t;
  }, [text, color]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh position={position} rotation={[0, rotation, 0]}><planeGeometry args={[5, 1.25]} /><meshBasicMaterial map={texture} /></mesh>;
}
function Paint({ position, size, color }: { position: [number, number, number]; size: [number, number]; color: string }) {
  return <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={size} /><meshStandardMaterial color={color} roughness={1} /></mesh>;
}
export function ArenaMap() {
  return <group>
    <RigidBody type="fixed" colliders={false}><CuboidCollider args={[config.width / 2, .5, config.length / 2]} position={[0, -.5, 0]} {...COLLIDER_MATERIALS.ground} collisionGroups={COLLISION_GROUPS.map} />
      <mesh position={[0, -.5, 0]} receiveShadow><boxGeometry args={[config.width, 1, config.length]} /><meshStandardMaterial color="#dfd8c7" roughness={1} /></mesh>
    </RigidBody>
    <Paint position={[-15, .003, 0]} size={[11, 40]} color="#d5d3c7" /><Paint position={[0, .004, 0]} size={[10, 28]} color="#dbe0d6" />
    <Paint position={[0, .006, 23]} size={[43, 8]} color="#e5aaa0" /><Paint position={[0, .006, -23]} size={[43, 8]} color="#a3cce0" />
    {ARENA_SOLIDS.map(s => <RigidBody key={s.id} type="fixed" colliders={false} position={[...s.position]} rotation={[...s.rotation]}>
      <CuboidCollider args={s.size.map(v => v / 2) as [number, number, number]} {...COLLIDER_MATERIALS.solid} collisionGroups={COLLISION_GROUPS.map} />
      <mesh castShadow receiveShadow><boxGeometry args={[...s.size]} /><meshStandardMaterial color={s.color} roughness={.9} /></mesh>
      {s.kind === 'building' && <mesh position={[0, s.size[1] / 2 - .06, 0]}><boxGeometry args={[s.size[0] + .04, .12, s.size[2] + .04]} /><meshStandardMaterial color="#edf0e5" /></mesh>}
      {s.kind === 'cover' && <mesh position={[0, 0, s.size[2] / 2 + .003]}><planeGeometry args={[s.size[0] * .8, .1]} /><meshStandardMaterial color="#eee4c9" /></mesh>}
    </RigidBody>)}
    <Sign text="RED BASE" position={[0, 2.2, 18.02]} color="#a4453a" /><Sign text="BLUE BASE" position={[0, 2.2, -15.98]} color="#2f6d9b" />
    <Sign text="BLUE BASE" position={[0, 2.2, -18.02]} rotation={Math.PI} color="#2f6d9b" /><Sign text="RED BASE" position={[0, 2.2, 15.98]} rotation={Math.PI} color="#a4453a" />
    <Sign text="MID / COURTYARD" position={[0, 2.1, 1.62]} color="#566e62" /><Sign text="MID / COURTYARD" position={[0, 2.1, -1.62]} rotation={Math.PI} color="#566e62" />
    {[-1, 1].map(side => <group key={side}>
      <Paint position={[14, .012, side * 15]} size={[7, 1]} color="#8099a7" /><Paint position={[-14, .012, side * 15]} size={[7, 1]} color="#aa976d" />
      {[-6, 6, -11, 11].map(x => <mesh key={x} position={[x, .014, side * 22]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.85, 1, 32]} /><meshBasicMaterial color={side > 0 ? '#b85248' : '#3d82b2'} /></mesh>)}
    </group>)}
  </group>;
}
