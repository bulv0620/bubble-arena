import { Canvas } from '@react-three/fiber';

export default function App() {
  return (
    <main className="scene" aria-label="Bubble Arena · 3D 立方体验证">
      <Canvas
        camera={{ position: [3, 2, 4], fov: 45 }}
        dpr={[1, 1.5]}
        frameloop="demand"
        fallback={<p className="fallback">当前浏览器无法显示 3D 场景，请启用 WebGL。</p>}
      >
        <color attach="background" args={['#f4f7fb']} />
        <ambientLight intensity={0.8} />
        <directionalLight position={[4, 6, 3]} intensity={2} />
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#36a6c5" roughness={0.6} />
        </mesh>
      </Canvas>
    </main>
  );
}
