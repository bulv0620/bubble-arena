import type { LocalTeamScore } from '../player/LocalTeamScore';
import { useEffect } from 'react';
import { useBeforePhysicsStep, useAfterPhysicsStep } from '@react-three/rapier';
import type { LocalMatch } from './LocalMatch';
export function MatchSimulation({ match }: { match: LocalMatch }) {
  useBeforePhysicsStep(() => match.step());
  useEffect(() => { match.setSceneReady(true); return () => match.setSceneReady(false); }, [match]);
  return null;
}

/** Mounted after all damage, score and rescue callbacks: never decide a winner mid-batch. */
export function MatchResolution({ match, score, collect }: { match: LocalMatch; score: LocalTeamScore; collect?: () => void }) {
  useAfterPhysicsStep(() => { collect?.(); match.resolve(score.getSnapshot()); });
  return null;
}
