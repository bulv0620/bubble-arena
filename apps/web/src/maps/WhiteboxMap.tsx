import { useRef } from 'react';
import { CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import { COLLISION_GROUPS, WHITEBOX_CONFIG } from '@bubble-arena/shared';

const { groundSize, groundThickness, groundTopY, testCubeSize, testCubeStartY } = WHITEBOX_CONFIG;

export function WhiteboxMap() {
  const testBody = useRef<RapierRigidBody>(null);

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
      <RigidBody type="fixed" colliders={false} position={WHITEBOX_CONFIG.movementTestWall.position}>
        <CuboidCollider
          args={WHITEBOX_CONFIG.movementTestWall.size.map((size) => size / 2) as [number, number, number]}
          collisionGroups={COLLISION_GROUPS.map}
        />
        <mesh castShadow receiveShadow>
          <boxGeometry args={WHITEBOX_CONFIG.movementTestWall.size} />
          <meshStandardMaterial color="#8f9eaa" roughness={0.9} />
        </mesh>
      </RigidBody>
      <gridHelper
        args={[groundSize, 40, '#a6b8b0', '#c1cec7']}
        position={[0, groundTopY + 0.002, 0]}
      />
      <RigidBody
        ref={testBody}
        type="dynamic"
        position={[0, testCubeStartY, 0]}
        colliders={false}
        ccd
        onSleep={() => {
          if (import.meta.env.DEV && testBody.current) {
            console.info('[ground.check]', JSON.stringify({
              position: testBody.current.translation(),
              velocity: testBody.current.linvel(),
            }));
          }
        }}
      >
        <CuboidCollider args={[testCubeSize / 2, testCubeSize / 2, testCubeSize / 2]} restitution={0} collisionGroups={COLLISION_GROUPS.testCube} />
        <mesh castShadow receiveShadow>
          <boxGeometry args={[testCubeSize, testCubeSize, testCubeSize]} />
          <meshStandardMaterial color="#36a6c5" roughness={0.6} />
        </mesh>
      </RigidBody>
    </group>
  );
}
