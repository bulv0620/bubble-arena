import { useBeforePhysicsStep } from '@react-three/rapier';
import type { FireInput } from './FireInput';
import type { ReloadInput } from './ReloadInput';
import type { LocalRifle } from './LocalRifle';

/** Uses the existing physics callback, never a render dt or UI-owned timer. */
export function RifleSimulation({ input, rifle, reload }: { input: FireInput; rifle: LocalRifle; reload: ReloadInput }) {
  useBeforePhysicsStep(() => {
    const shot = rifle.step(input.consume(), reload.consume());
    if (shot && import.meta.env.DEV) console.info('[weapon.check]', JSON.stringify({ ...shot, ...rifle.getSnapshot() }));
  });
  return null;
}
