import { PHYSICS_CONFIG, PLAYER_LIFE_CONFIG, parsePlayerLifeConfig, parsePlayerLifeEvent,
  type PlayerLifeConfig, type PlayerLifeEvent, type PlayerLifeSnapshot, type PlayerLifeStatus } from '@bubble-arena/shared';

/** Transition guards only. Damage, clocks, rescue eligibility and spawning are
 * resolved by the simulation before submitting facts; there are no UI timers. */
export class PlayerLifeMachine {
  private state: PlayerLifeSnapshot;
  readonly config: PlayerLifeConfig;
  private readonly downedTicks: number;
  private readonly rescueTicks: number;
  private readonly respawnTicks: number;
  constructor(lifeId = 1, config: PlayerLifeConfig = PLAYER_LIFE_CONFIG) {
    if (!Number.isSafeInteger(lifeId) || lifeId < 1) throw new RangeError('Invalid life identity');
    this.config = parsePlayerLifeConfig(config);
    this.downedTicks = Math.ceil(this.config.downedDuration * PHYSICS_CONFIG.tickRate);
    this.rescueTicks = Math.ceil(this.config.rescueDuration * PHYSICS_CONFIG.tickRate);
    this.respawnTicks = Math.ceil(this.config.respawnDelay * PHYSICS_CONFIG.tickRate);
    this.state = Object.freeze({ status: 'normal', lifeId, revision: 0 });
  }
  getSnapshot = () => this.state;
  /** matchFinished is required: the match owner must explicitly supply its gate. */
  transition(event: PlayerLifeEvent, matchFinished: boolean): boolean {
    if (typeof matchFinished !== 'boolean') throw new TypeError('Expected finished gate');
    const fact = parsePlayerLifeEvent(event), current = this.state;
    if (matchFinished || fact.lifeId !== current.lifeId || fact.revision !== current.revision) return false;
    let next: PlayerLifeStatus | undefined;
    switch (fact.type) {
      case 'hp_depleted':
        if (fact.hp === 0) next = current.status === 'normal' ? 'downed' : current.status === 'downed' ? 'eliminated' : undefined;
        break;
      case 'downed_timeout':
        if (current.status === 'downed' && fact.elapsedTicks >= this.downedTicks) next = 'eliminated';
        break;
      case 'rescue_completed':
        if (current.status === 'downed' && fact.elapsedTicks >= this.rescueTicks) next = 'normal';
        break;
      case 'environment_death':
        if (current.status === 'normal' || current.status === 'downed') next = 'eliminated';
        break;
      case 'respawn_due':
        if (current.status === 'eliminated' && fact.elapsedTicks >= this.respawnTicks) next = 'respawning';
        break;
      case 'spawn_completed':
        if (current.status === 'respawning') next = 'normal';
        break;
    }
    if (!next) return false;
    const lifeId = current.lifeId + (fact.type === 'spawn_completed' ? 1 : 0), revision = current.revision + 1;
    if (!Number.isSafeInteger(lifeId) || !Number.isSafeInteger(revision)) throw new RangeError('Life identity exhausted');
    this.state = Object.freeze({ status: next, lifeId, revision });
    return true;
  }
}
