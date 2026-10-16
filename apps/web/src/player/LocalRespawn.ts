import { selectSpawnPoint, type SpawnSelection } from '@bubble-arena/game-core';
import { WHITEBOX_COLLISION_HASH, WHITEBOX_SPAWNS, type SpawnCatalog, type SpawnEnemy, PLAYER_CONFIG } from '@bubble-arena/shared';
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
    private readonly motion: RifleMotion, private readonly feedback: ShotFeedback, private readonly recoil: RifleRecoil, private readonly catalog: SpawnCatalog = WHITEBOX_SPAWNS, private readonly enemies: () => readonly SpawnEnemy[] = () => []) {}
  step(world: World, body: RapierRigidBody, movement: RapierMovement, clearInput: () => void) {
    if (!body.isValid() || this.health.getSnapshot().status !== 'respawning') return false;
    if (this.catalog === WHITEBOX_SPAWNS && this.catalog.collisionHash !== WHITEBOX_COLLISION_HASH) throw new Error('Spawn/map version mismatch');
    const peers = this.enemies();
    const clear = (p: { x: number; y: number; z: number }) => isSpawnClear(world, p) && peers.every(c => c.status === 'eliminated' || c.status === 'respawning' || Math.hypot(c.position.x-p.x, c.position.z-p.z) >= PLAYER_CONFIG.radius * 2 + .1);
    const selected = selectSpawnPoint(this.health.actor.teamId, peers, clear, false, this.catalog)!;
    // Revalidate the primary fallback too. Corrupt/changed geometry must never cause an embedded spawn.
    if (!clear(selected.point.position)) return false;
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
