import { useEffect } from 'react';
import { useBeforePhysicsStep } from '@react-three/rapier';
import type { LocalPlayerHealth } from './LocalPlayerHealth';

export function PlayerHealthSimulation({ player }: { player: LocalPlayerHealth }) {
  useBeforePhysicsStep(() => {
    const before = player.getSnapshot();
    const accepted = player.step();
    if (import.meta.env.DEV && (accepted || before.status !== player.getSnapshot().status)) console.info('[player.health]', JSON.stringify({ tick: player.getTick(), ...player.getSnapshot() }));
  });
  useEffect(() => () => player.clearPending(), [player]);
  return null;
}
