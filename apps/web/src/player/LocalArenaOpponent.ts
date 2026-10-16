import { ArenaBotBrain, MovementSlow, PlayerHealthState, WeaponFireState } from '@bubble-arena/game-core';
import { PLAYER_LIFE_CONFIG, RESCUE_PROTECTION_CONFIG, RESPAWN_CONFIG, TRAINING_SCORE_ACTORS as actors, WEAPON_CONFIGS, TRAINING_RIFLE_AMMO_POLICY, ARENA_SPAWNS, type RescuePosition, type EliminationFact, type DamageActor, type ArenaBotSeat, arenaBotActor, arenaActorLabel, ARENA_BOT_ROUTE } from '@bubble-arena/shared';
import type { RescueChannel, TrainingHit } from '@bubble-arena/game-core';
import type { LocalTeamScore } from './LocalTeamScore';
import { ShotFeedback } from '../effects/ShotFeedback';
import { DamageNumbers } from '../effects/DamageNumbers';
export class LocalArenaOpponent {
  private readonly health: PlayerHealthState;
  readonly brain: ArenaBotBrain;
  readonly actor: DamageActor;
  readonly label: string;
  readonly spawn: RescuePosition;
  fire = new WeaponFireState(WEAPON_CONFIGS.rifle, TRAINING_RIFLE_AMMO_POLICY);
  private readonly slow = new MovementSlow();
  readonly damageNumbers = new DamageNumbers();
  readonly feedback = new ShotFeedback();
  private tick = -1;
  private sequence = 0;
  private damageRevision = 0;
  grounded = true;
  facingYaw = Math.PI;
  getDamageRevision = () => this.damageRevision;
  private observed: EliminationFact | null = null;
  private position: RescuePosition = ARENA_SPAWNS.points.find(p => p.team === 'blue' && p.primary)!.position;
  private readonly listeners = new Set<() => void>();
  constructor(private readonly score: LocalTeamScore, private readonly canPlay: () => boolean, readonly seat: ArenaBotSeat = { teamId: 'blue', slot: 0 }, private readonly humanActor: DamageActor = actors.player) {
    this.facingYaw = seat.teamId === 'blue' ? Math.PI : 0; this.actor = arenaBotActor(seat); this.label = arenaActorLabel(this.actor.playerId);
    this.health = new PlayerHealthState(1, PLAYER_LIFE_CONFIG, RESCUE_PROTECTION_CONFIG, RESPAWN_CONFIG, this.actor);
    this.spawn = ARENA_SPAWNS.points.filter(p => p.team === seat.teamId)[seat.slot].position; this.position = this.spawn;
    const side = this.spawn.x > 0 ? -1 : 1, end = seat.teamId === 'red' ? -1 : 1;
    const route = [{ x: this.spawn.x, z: this.spawn.z }, ...ARENA_BOT_ROUTE.map(p => ({ x: p.x * side, z: p.z * end }))];
    this.brain = new ArenaBotBrain(route);
  }
  getPosition = () => this.position;
  getTick = () => this.tick;
  setPosition(position: RescuePosition) { this.position = { ...position }; }
  getSnapshot = () => this.health.getSnapshot();
  getDowner = () => this.health.getDowner();
  getElimination = () => this.health.getElimination();
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private notify() { for (const listener of this.listeners) listener(); }
  isTargetable = () => this.canPlay() && ['normal', 'downed'].includes(this.getSnapshot().status);
  getSpeedMultiplier = () => this.slow.getMultiplier();
  receiveHit(hit: TrainingHit, damage = WEAPON_CONFIGS.rifle.damage) {
    if (!this.canPlay() || this.tick < 0) return false;
    if (!hit || !Number.isSafeInteger(hit.tick) || hit.tick < 0 || !Number.isSafeInteger(hit.sequence) || hit.sequence < 1) throw new TypeError('Invalid arena hit');
    if (hit.sequence <= this.lastHumanHit) return false;
    this.lastHumanHit = hit.sequence;
    return this.receiveCombatDamage(damage, this.humanActor);
  }
  private lastHumanHit = 0;
  private received = 0;
  receiveCombatDamage(damage: number, source: DamageActor) {
    if (!this.canPlay() || this.tick < 0 || source.teamId === this.actor.teamId) return false;
    const before = this.getSnapshot();
    const accepted = this.health.receiveDamage({ lifeId: before.lifeId, tick: this.tick, sequence: ++this.received }, damage, false, source);
    if (accepted) this.damageRevision++;
    if (accepted && before.status === 'normal') this.damageNumbers.push(++this.sequence, before.hp - this.getSnapshot().hp);
    if (before !== this.getSnapshot()) this.notify(); return accepted;
  }
  finishBubble(fact: {lifeId:number;revision:number}, source: DamageActor) {
    if(!this.canPlay()||this.tick<0)return false;
    const accepted=this.health.finishBubble(fact,this.tick,source,false);if(accepted){this.damageRevision++;this.notify();}return accepted;
  }
  completeRescue(channel: RescueChannel) {
    if(!this.canPlay()||channel.target.playerId!==this.actor.playerId)return false;
    const accepted=this.health.completeRescue({lifeId:channel.target.lifeId,revision:channel.target.revision,elapsedTicks:channel.elapsedTicks},this.tick,false);
    if(accepted){this.slow.clear();this.notify();}return accepted;
  }
  applySlow() { if (this.tick >= 0 && this.canPlay() && this.health.canReceiveControl(this.tick, false)) this.slow.apply(); }
  advance(tick: number) {
    if (!this.canPlay()) return;
    this.tick = tick; this.damageNumbers.step(tick); this.slow.step(); const before = this.getSnapshot(); this.health.advanceTick(tick, false);
    if (before !== this.getSnapshot()) this.notify();
  }
  onFire(sequence: number) { const s = this.getSnapshot(); const changed = this.health.onAcceptedFire({ lifeId: s.lifeId, revision: s.revision, tick: this.tick, sequence }, !this.canPlay()); if (changed) this.notify(); }
  drainScoreFacts() { const fact = this.health.getElimination(); if (!fact || fact === this.observed) return []; this.observed = fact; return [fact]; }
  completeSpawn(apply: () => boolean) {
    const s = this.getSnapshot();
    const accepted = this.health.completeSpawn({ lifeId: s.lifeId, revision: s.revision }, this.tick, apply, !this.canPlay());
    if (accepted) { this.lastHumanHit = 0; this.observed = null; this.brain.reset(); this.fire = new WeaponFireState(WEAPON_CONFIGS.rifle, TRAINING_RIFLE_AMMO_POLICY); this.slow.clear(); this.damageNumbers.clear(); this.score.beginLife(this.actor.playerId, this.getSnapshot().lifeId, this.tick, false); this.notify(); }
    return accepted;
  }
  dispose() { this.feedback.clear(); this.damageNumbers.clear(); this.listeners.clear(); }
}
