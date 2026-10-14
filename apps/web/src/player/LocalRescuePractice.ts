import type { LocalTeamScore } from './LocalTeamScore';
import { PlayerHealthState, RescueProgress, type PlayerHealthSnapshot, type RescueChannel, type RescueInterruptReason } from '@bubble-arena/game-core';
import { TRAINING_RESCUE_CONFIG as config, TRAINING_RESCUE_MODES, PHYSICS_CONFIG,
  type TrainingRescueMode, type RescueParticipant, type RescueControl, type RescuePosition } from '@bubble-arena/shared';
import type { World } from '@dimforge/rapier3d-compat';
import type { RescueInputState } from '../input/RescueInput';
import type { LocalPlayerHealth } from './LocalPlayerHealth';
import type { LocalLoadout } from '../weapons/LocalLoadout';
import { isRescueLineClear } from './rescueLineOfSight';
export interface RescuePracticeSnapshot { readonly mode: TrainingRescueMode; readonly ally: RescuePosition | null; readonly allyHealth: PlayerHealthSnapshot | null; readonly channel: RescueChannel | null; readonly message: string }
/** Stage-4 fixture only. UI queues a mode intent; all positions/damage/progress
 * are resolved in physics callbacks. Never introduces a formal match teammate. */
export class LocalRescuePractice {
  private readonly rule = new RescueProgress();
  private tick = 0;
  private mode: TrainingRescueMode = 'off';
  private pending: TrainingRescueMode | null = null;
  private ally: RescuePosition | null = null;
  private injuryQueued = false;
  private previousDamageRevision;
  private allyHealth = new PlayerHealthState();
  private allyLife = 0;
  private state: RescuePracticeSnapshot = Object.freeze({ mode: 'off', ally: null, allyHealth: null, channel: null, message: '' });
  private readonly listeners = new Set<() => void>();
  constructor(private readonly health: LocalPlayerHealth, private readonly loadout: LocalLoadout, private readonly score?: LocalTeamScore) { this.previousDamageRevision = health.getDamageRevision(); }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  configure = (mode: TrainingRescueMode) => {
    if (!TRAINING_RESCUE_MODES.includes(mode)) throw new TypeError('Invalid rescue practice mode');
    if (!this.health.canPlay()) return;
    this.pending = mode;
  };
  private publish(channel: RescueChannel | null, message: string) {
    this.loadout.setRescuing(channel?.rescuer.playerId === config.playerId);
    const allyHealth = this.ally ? this.allyHealth.getSnapshot() : null;
    if (this.state.mode === this.mode && this.state.ally === this.ally && this.state.allyHealth === allyHealth && this.state.channel === channel && this.state.message === message) return;
    this.state = Object.freeze({ mode: this.mode, ally: this.ally, allyHealth, channel, message }); for (const listener of this.listeners) listener();
  }
  cancel = () => { this.rule.clear(); this.publish(null, this.state.channel ? '救援已中断，请重新按 E' : this.state.message); };
  resetForRespawn() {
    this.pending = null; this.rule.clear(); this.mode = 'off'; this.ally = null; this.injuryQueued = false;
    this.previousDamageRevision = this.health.getDamageRevision(); this.publish(null, '');
  }
  dispose = () => { this.pending = null; this.cancel(); };
  step(world: World, rawPosition: RescuePosition, grounded: boolean, input: RescueInputState) {
    if (!this.health.canPlay()) { this.pending = null; this.cancel(); return this.rule.getSnapshot(); }
    const tick = this.tick++;
    const position = Object.freeze({ x: rawPosition.x, y: rawPosition.y, z: rawPosition.z });
    const health = this.health.getSnapshot();
    const damaged = this.health.getDamageRevision() !== this.previousDamageRevision;
    this.previousDamageRevision = this.health.getDamageRevision();
    if (this.pending !== null) {
      this.mode = this.pending; this.pending = null; this.rule.clear(); this.injuryQueued = false;
      this.ally = this.mode === 'off' ? null : Object.freeze({ x: position.x + config.offsetX, y: position.y, z: position.z + config.offsetZ });
      if (this.ally) {
        this.allyLife++; this.allyHealth = new PlayerHealthState(this.allyLife);
        if (this.allyLife > 1) this.score?.beginLife(config.allyId, this.allyLife, this.health.getTick(), false);
      }
      if (this.ally && this.mode !== 'self-rescue') this.allyHealth.receiveDamage({ lifeId: this.allyLife, sequence: 1, tick }, this.allyHealth.getSnapshot().maxHp, false);
      this.publish(null, '');
    }
    this.allyHealth.advanceTick(tick, false);
    const current = this.state.channel;
    if (current && this.ally && this.mode === 'crawl-away') {
      const dx = this.ally.x - position.x, dz = this.ally.z - position.z, distance = Math.hypot(dx, dz);
      if (distance > 0) this.ally = Object.freeze({ ...this.ally, x: this.ally.x + dx / distance * config.crawlSpeed * PHYSICS_CONFIG.timeStep,
        z: this.ally.z + dz / distance * config.crawlSpeed * PHYSICS_CONFIG.timeStep });
    }
    if (current && this.mode === 'injury' && current.elapsedTicks >= config.injuryAfterTicks && !this.injuryQueued) {
      this.injuryQueued = this.health.requestTest('hit');
    }
    const players: RescueParticipant[] = [{ playerId: config.playerId, teamId: 'red', life: { status: health.status, lifeId: health.lifeId, revision: health.revision }, position, grounded, connected: true }];
    const allyState = this.allyHealth.getSnapshot();
    if (this.ally) players.push({ playerId: config.allyId, teamId: 'red', life: { status: allyState.status, lifeId: allyState.lifeId, revision: allyState.revision }, position: this.ally, grounded: true, connected: true });
    const controls: RescueControl[] = [{ ...input, playerId: config.playerId, targetPlayerId: this.ally ? config.allyId : null }];
    if (this.ally && this.mode === 'self-rescue') controls.push({ playerId: config.allyId, targetPlayerId: config.playerId, held: health.status === 'downed' && input.active, active: input.active,
      move: false, jump: false, fire: false, reload: false, weaponSwitch: false, aim: false });
    try {
      let snapshot = this.rule.step(tick, { players, controls,
        damagedPlayerIds: damaged ? [config.playerId] : [], matchFinished: false }, (from, to) => isRescueLineClear(world, from, to));
      for (const event of snapshot.events) if (event.kind === 'ready') this.rule.complete(tick, event.rescuerId, channel => {
        if (channel.target.playerId === config.playerId) {
          const accepted = this.health.completeRescue(channel);
          if (accepted) this.score?.recordRescue(channel.rescuer.playerId, channel.target.playerId, channel.target.lifeId, channel.target.revision, this.health.getTick());
          return accepted;
        }
        if (channel.target.playerId !== config.allyId) return false;
        const accepted = this.allyHealth.completeRescue({ lifeId: channel.target.lifeId, revision: channel.target.revision, elapsedTicks: channel.elapsedTicks }, tick, false);
        if (accepted) this.score?.recordRescue(channel.rescuer.playerId, channel.target.playerId, channel.target.lifeId, channel.target.revision, this.health.getTick());
        return accepted;
      }, false);
      snapshot = this.rule.getSnapshot();
      const channel = snapshot.channels[0] ?? null, event = snapshot.events[0];
      if (!current && channel) this.injuryQueued = false;
      let message = damaged && health.status === 'downed' ? '' : this.state.message;
      if (channel) message = channel.ready ? '3秒救援进度测试完成' : '';
      else if (event?.kind === 'completed') message = event.targetId === config.playerId ? '你已被救起 · 50 HP' : '队友已救起 · 50 HP';
      else if (event?.kind === 'interrupted') message = interruptMessage(event.reason);
      this.publish(channel, message);
      return snapshot;
    } catch (error) { this.publish(null, '救援已中断'); throw error; }
  }
  getAllyHp = () => this.allyHealth.getSnapshot().status === 'downed' ? this.allyHealth.getSnapshot().downedHp : this.allyHealth.getSnapshot().hp;
  getSelfHealth = () => this.health.getSnapshot();
}
function interruptMessage(reason: RescueInterruptReason) {
  if (reason === 'out-of-range') return '队友已移出2米范围 · 救援中断';
  if (reason === 'damaged') return '受到伤害 · 救援中断';
  if (reason === 'blocked') return '视线被遮挡 · 救援中断';
  if (reason === 'released') return '已松开 E · 进度清零';
  return '救援已中断，请松开 E 后重试';
}
