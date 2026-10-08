const GROUND_SIZE = 80;
const TEST_CUBE_SIZE = 1;

export function WhiteboxMap() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
        <meshStandardMaterial color="#dbe4df" roughness={1} />
      </mesh>
      <gridHelper
        args={[GROUND_SIZE, 40, '#a6b8b0', '#c1cec7']}
        position={[0, 0.002, 0]}
      />
      <mesh position={[0, TEST_CUBE_SIZE / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[TEST_CUBE_SIZE, TEST_CUBE_SIZE, TEST_CUBE_SIZE]} />
        <meshStandardMaterial color="#36a6c5" roughness={0.6} />
      </mesh>
    </group>
  );
}
