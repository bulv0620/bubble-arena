import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { COLLISION_GROUPS, WHITEBOX_CONFIG, WHITEBOX_SOLIDS } from '@bubble-arena/shared';

const { groundSize, groundThickness, groundTopY } = WHITEBOX_CONFIG;

export function WhiteboxMap() {
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={[groundSize / 2, groundThickness / 2, groundSize / 2]}
          position={[0, groundTopY - groundThickness / 2, 0]}
          friction={0.8}
          restitution={0}
          collisionGroups={COLLISION_GROUPS.map}
        />
        <mesh position={[0, groundTopY, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[groundSize, groundSize]} />
          <meshStandardMaterial color="#dbe4df" roughness={1} />
        </mesh>
      </RigidBody>
      {WHITEBOX_SOLIDS.map((solid) => (
        <RigidBody key={solid.id} type="fixed" colliders={false} position={solid.position} rotation={[0, 0, solid.rotationZ ?? 0]}>
          <CuboidCollider
            args={solid.size.map((size) => size / 2) as [number, number, number]}
            collisionGroups={COLLISION_GROUPS.map}
          />
          <mesh castShadow receiveShadow>
            <boxGeometry args={solid.size} />
            <meshStandardMaterial color={solid.color} roughness={0.9} />
          </mesh>
        </RigidBody>
      ))}
      <gridHelper
        args={[groundSize, 40, '#a6b8b0', '#c1cec7']}
        position={[0, groundTopY + 0.002, 0]}
      />
    </group>
  );
}
