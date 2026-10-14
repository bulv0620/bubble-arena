import { selectSpawnPoint, type SpawnSelection } from '@bubble-arena/game-core';
import { WHITEBOX_COLLISION_HASH, WHITEBOX_SPAWNS } from '@bubble-arena/shared';
import type { World } from '@dimforge/rapier3d-compat';
import type { RapierRigidBody } from '@react-three/rapier';
import type { LocalPlayerHealth } from './LocalPlayerHealth';
import type { LocalLoadout } from '../weapons/LocalLoadout';
import type { LocalRescuePractice } from './LocalRescuePractice';
import type { RapierMovement } from './RapierMovement';
import type { RifleMotion } from '../weapons/RifleMotion';
import type { ShotFeedback } from '../effects/ShotFeedback';
import type { RifleRecoil } from '../weapons/RifleRecoil';
import { isSpawnClear } from './spawnClearance';
/** Training has no live enemy roster. Formal authority supplies its own selection facts. */
export class LocalRespawn {
  private lastSelection: SpawnSelection | null = null;
  private revision = 0;
  getRevision = () => this.revision;
  getSelection = () => this.lastSelection;
  constructor(private readonly health: LocalPlayerHealth, private readonly loadout: LocalLoadout, private readonly rescue: LocalRescuePractice,
    private readonly motion: RifleMotion, private readonly feedback: ShotFeedback, private readonly recoil: RifleRecoil) {}
  step(world: World, body: RapierRigidBody, movement: RapierMovement, clearInput: () => void) {
    if (!body.isValid() || this.health.getSnapshot().status !== 'respawning') return false;
    if (WHITEBOX_SPAWNS.collisionHash !== WHITEBOX_COLLISION_HASH) throw new Error('Spawn/map version mismatch');
    const selected = selectSpawnPoint('red', [], p => isSpawnClear(world, p), false)!;
    // Revalidate the primary fallback too. Corrupt/changed geometry must never cause an embedded spawn.
    if (!isSpawnClear(world, selected.point.position)) return false;
    const accepted = this.health.completeSpawn(() => {
      movement.reset(); clearInput(); this.rescue.resetForRespawn(); this.loadout.resetForRespawn(); this.motion.reset(); this.feedback.clear(); this.recoil.reset();
      body.setTranslation(selected.point.position, true); body.setNextKinematicTranslation(selected.point.position);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true); body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      return true;
    });
    if (accepted) { this.lastSelection = selected; this.revision++; }
    return accepted;
  }
}
