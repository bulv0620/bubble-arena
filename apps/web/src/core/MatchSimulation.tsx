import { useEffect } from 'react';
import { useBeforePhysicsStep } from '@react-three/rapier';
import type { LocalMatch } from './LocalMatch';
export function MatchSimulation({ match }: { match: LocalMatch }) {
  useBeforePhysicsStep(() => match.step());
  useEffect(() => { match.setSceneReady(true); return () => match.setSceneReady(false); }, [match]);
  return null;
}
