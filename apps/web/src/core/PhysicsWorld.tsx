import { useEffect, useRef, type ReactNode } from 'react';
import { useThree } from '@react-three/fiber';
import { Physics, useAfterPhysicsStep } from '@react-three/rapier';
import { PHYSICS_CONFIG, WHITEBOX_COLLISION_HASH, WHITEBOX_SPAWN_HASH } from '@bubble-arena/shared';

// Development-only proof that real WASM steps use the configured interval.
function PhysicsStepDiagnostics() {
  const sample = useRef({ steps: 0, min: Infinity, max: 0 });

  useAfterPhysicsStep((world) => {
    if (sample.current.steps >= PHYSICS_CONFIG.tickRate) return;
    sample.current.steps += 1;
    sample.current.min = Math.min(sample.current.min, world.timestep);
    sample.current.max = Math.max(sample.current.max, world.timestep);

    if (sample.current.steps === PHYSICS_CONFIG.tickRate) {
      console.info('[physics.check]', JSON.stringify({
        ...sample.current,
        bodies: world.bodies.len(),
        colliders: world.colliders.len(),
        mapHash: WHITEBOX_COLLISION_HASH, spawnHash: WHITEBOX_SPAWN_HASH,
      }));
    }
  });

  return null;
}

export function PhysicsWorld({ children }: { children: ReactNode }) {
  const invalidate = useThree((state) => state.invalidate);

  // The empty world does not invalidate on body motion. Repaint once after
  // the suspended WASM initialization commits the static scene.
  useEffect(() => { invalidate(); }, [invalidate]);

  return (
    <Physics
      gravity={PHYSICS_CONFIG.gravity}
      timeStep={PHYSICS_CONFIG.timeStep}
      updateLoop="independent"
      colliders={false}
      interpolate={false}
    >
      {children}
      {import.meta.env.DEV && <PhysicsStepDiagnostics />}
    </Physics>
  );
}
