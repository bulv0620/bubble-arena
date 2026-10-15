import { ArenaBotBrain, MovementSlow, PlayerHealthState, WeaponFireState } from '@bubble-arena/game-core';
import { PLAYER_LIFE_CONFIG, RESCUE_PROTECTION_CONFIG, RESPAWN_CONFIG, TRAINING_SCORE_ACTORS as actors, WEAPON_CONFIGS, TRAINING_RIFLE_AMMO_POLICY, ARENA_SPAWNS, type RescuePosition, type EliminationFact } from '@bubble-arena/shared';
import type { TrainingHit } from '@bubble-arena/game-core';
import type { LocalTeamScore } from './LocalTeamScore';
import { DamageNumbers } from '../effects/DamageNumbers';
export class LocalArenaOpponent {
  private readonly health = new PlayerHealthState(1, PLAYER_LIFE_CONFIG, RESCUE_PROTECTION_CONFIG, RESPAWN_CONFIG, actors['enemy-a']);
  readonly brain = new ArenaBotBrain();
  fire = new WeaponFireState(WEAPON_CONFIGS.rifle, TRAINING_RIFLE_AMMO_POLICY);
  private readonly slow = new MovementSlow();
  readonly damageNumbers = new DamageNumbers();
  private tick = -1;
  private sequence = 0;
  private observed: EliminationFact | null = null;
  private position: RescuePosition = ARENA_SPAWNS.points.find(p => p.team === 'blue' && p.primary)!.position;
  private readonly listeners = new Set<() => void>();
  constructor(private readonly score: LocalTeamScore, private readonly canPlay: () => boolean) {}
  getPosition = () => this.position;
  setPosition(position: RescuePosition) { this.position = { ...position }; }
  getSnapshot = this.health.getSnapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private notify() { for (const listener of this.listeners) listener(); }
  isTargetable = () => this.canPlay() && ['normal', 'downed'].includes(this.getSnapshot().status);
  getSpeedMultiplier = () => this.slow.getMultiplier();
  receiveHit(hit: TrainingHit, damage = WEAPON_CONFIGS.rifle.damage) {
    if (!this.canPlay() || this.tick < 0) return false;
    const before = this.getSnapshot();
    const accepted = this.health.receiveDamage({ lifeId: before.lifeId, tick: this.tick, sequence: hit.sequence }, damage, false, actors.player);
    if (accepted) this.damageNumbers.push(++this.sequence, before.status === 'downed' ? before.downedHp - this.getSnapshot().downedHp : before.hp - this.getSnapshot().hp);
    if (before !== this.getSnapshot()) this.notify(); return accepted;
  }
  applySlow() { if (this.tick >= 0 && this.canPlay() && this.health.canReceiveControl(this.tick, false)) this.slow.apply(); }
  advance(tick: number) {
    if (!this.canPlay()) return;
    this.tick = tick; this.slow.step(); const before = this.getSnapshot(); this.health.advanceTick(tick, false);
    if (before !== this.getSnapshot()) this.notify();
  }
  onFire(sequence: number) { const s = this.getSnapshot(); const changed = this.health.onAcceptedFire({ lifeId: s.lifeId, revision: s.revision, tick: this.tick, sequence }, !this.canPlay()); if (changed) this.notify(); }
  drainScoreFacts() { const fact = this.health.getElimination(); if (!fact || fact === this.observed) return []; this.observed = fact; return [fact]; }
  completeSpawn(apply: () => boolean) {
    const s = this.getSnapshot();
    const accepted = this.health.completeSpawn({ lifeId: s.lifeId, revision: s.revision }, this.tick, apply, !this.canPlay());
    if (accepted) { this.observed = null; this.brain.reset(); this.fire = new WeaponFireState(WEAPON_CONFIGS.rifle, TRAINING_RIFLE_AMMO_POLICY); this.slow.clear(); this.damageNumbers.clear(); this.score.beginLife(actors['enemy-a'].playerId, this.getSnapshot().lifeId, this.tick, false); this.notify(); }
    return accepted;
  }
  dispose() { this.damageNumbers.clear(); this.listeners.clear(); }
}
