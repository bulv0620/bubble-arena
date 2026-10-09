import { useBeforePhysicsStep } from '@react-three/rapier';
import type { FireInput } from './FireInput';
import type { LocalRifle } from './LocalRifle';

/** Uses the existing physics callback, never a render dt or UI-owned timer. */
export function RifleSimulation({ input, rifle }: { input: FireInput; rifle: LocalRifle }) {
  useBeforePhysicsStep(() => {
    const shot = rifle.step(input.consume());
    if (shot && import.meta.env.DEV) console.info('[weapon.check]', JSON.stringify({ ...shot, ...rifle.getSnapshot() }));
  });
  return null;
}
