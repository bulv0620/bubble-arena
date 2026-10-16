import type { LocalMatch } from './LocalMatch';

/** Queue the existing start intent once the physics scene is ready; no UI clock or bypass of countdown. */
export function bindRoomStart(match: LocalMatch) {
  const start = () => { if (match.isSceneReady() && match.getSnapshot().phase === 'waiting') match.requestStart(); };
  const unsubscribe = match.subscribe(start);
  start();
  return unsubscribe;
}
