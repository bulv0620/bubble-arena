import type { RapierRigidBody } from '@react-three/rapier';
import type { World } from '@dimforge/rapier3d-compat';
import { selectSpawnPoint } from '@bubble-arena/game-core';
import { ARENA_SPAWNS, PLAYER_CONFIG, type SpawnEnemy } from '@bubble-arena/shared';
import { isSpawnClear } from './spawnClearance';
import type { LocalArenaOpponent } from './LocalArenaOpponent';
import type { LocalPlayerHealth } from './LocalPlayerHealth';
import type { RapierMovement } from './RapierMovement';
import type { ShotFeedback } from '../effects/ShotFeedback';
/** One opponent's spawn transaction; never clears the local player's input or weapons. */
export function respawnArenaOpponent({ world, opponent, health, body, player, movement, feedback, others }: {
  world: World; opponent: LocalArenaOpponent; health: LocalPlayerHealth; body: RapierRigidBody;
  player: RapierRigidBody; others?: readonly SpawnEnemy[]; movement: RapierMovement; feedback: ShotFeedback;
}) {
  if (!health.canPlay() || opponent.getSnapshot().status !== 'respawning' || !body.isValid() || !player.isValid()) return false;
  // Rapier returns a Vector3 class instance; shared facts intentionally accept only plain data.
  const p = player.translation();
  const candidates = others ?? [{ playerId: health.actor.playerId, team: health.actor.teamId,
    status: health.getSnapshot().status, position: { x: p.x, y: p.y, z: p.z } }];
  const clear = (p: { x: number; y: number; z: number }) => isSpawnClear(world, p) && candidates.every(c => c.playerId === opponent.actor.playerId || c.status === 'eliminated' || c.status === 'respawning' || Math.hypot(c.position.x-p.x, c.position.z-p.z) >= PLAYER_CONFIG.radius * 2 + .1);
  const chosen = selectSpawnPoint(opponent.actor.teamId, candidates, clear, false, ARENA_SPAWNS)!;
  if (!clear(chosen.point.position)) return false;
  return opponent.completeSpawn(() => {
    movement.reset();
    body.setTranslation(chosen.point.position, true); body.setNextKinematicTranslation(chosen.point.position);
    opponent.setPosition(chosen.point.position); feedback.clear(); return true;
  });
}
