import { useEffect } from 'react';
import { useBeforePhysicsStep } from '@react-three/rapier';
import type { LocalPlayerHealth } from './LocalPlayerHealth';

export function PlayerHealthSimulation({ player }: { player: LocalPlayerHealth }) {
  useBeforePhysicsStep(() => {
    const accepted = player.step();
    if (accepted && import.meta.env.DEV) console.info('[player.health]', JSON.stringify(player.getSnapshot()));
  });
  useEffect(() => () => player.clearPending(), [player]);
  return null;
}
