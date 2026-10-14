import { RescueProgress, type RescueChannel, type RescueInterruptReason } from '@bubble-arena/game-core';
import { TRAINING_RESCUE_CONFIG as config, TRAINING_RESCUE_MODES, PHYSICS_CONFIG, PLAYER_LIFE_CONFIG,
  type TrainingRescueMode, type RescueParticipant, type RescuePosition } from '@bubble-arena/shared';
import type { World } from '@dimforge/rapier3d-compat';
import type { RescueInputState } from '../input/RescueInput';
import type { LocalPlayerHealth } from './LocalPlayerHealth';
import type { LocalLoadout } from '../weapons/LocalLoadout';
import { isRescueLineClear } from './rescueLineOfSight';
export interface RescuePracticeSnapshot { readonly mode: TrainingRescueMode; readonly ally: RescuePosition | null; readonly channel: RescueChannel | null; readonly message: string }
/** Stage-4 fixture only. UI queues a mode intent; all positions/damage/progress
 * are resolved in physics callbacks. Never introduces a formal match teammate. */
export class LocalRescuePractice {
  private readonly rule = new RescueProgress();
  private tick = 0;
  private mode: TrainingRescueMode = 'off';
  private pending: TrainingRescueMode | null = null;
  private ally: RescuePosition | null = null;
  private injuryQueued = false;
  private previousHealth;
  private state: RescuePracticeSnapshot = Object.freeze({ mode: 'off', ally: null, channel: null, message: '' });
  private readonly listeners = new Set<() => void>();
  constructor(private readonly health: LocalPlayerHealth, private readonly loadout: LocalLoadout) { this.previousHealth = health.getSnapshot(); }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  configure = (mode: TrainingRescueMode) => {
    if (!TRAINING_RESCUE_MODES.includes(mode)) throw new TypeError('Invalid rescue practice mode');
    this.pending = mode;
  };
  private publish(channel: RescueChannel | null, message: string) {
    this.loadout.setRescuing(channel !== null);
    if (this.state.mode === this.mode && this.state.ally === this.ally && this.state.channel === channel && this.state.message === message) return;
    this.state = Object.freeze({ mode: this.mode, ally: this.ally, channel, message }); for (const listener of this.listeners) listener();
  }
  cancel = () => { this.rule.clear(); this.publish(null, this.state.channel ? '救援已中断，请重新按 E' : this.state.message); };
  dispose = () => { this.pending = null; this.cancel(); };
  step(world: World, rawPosition: RescuePosition, grounded: boolean, input: RescueInputState) {
    const position = Object.freeze({ x: rawPosition.x, y: rawPosition.y, z: rawPosition.z });
    const health = this.health.getSnapshot();
    const damaged = health.hp < this.previousHealth.hp || health.downedHp < this.previousHealth.downedHp;
    this.previousHealth = health;
    if (this.pending !== null) {
      this.mode = this.pending; this.pending = null; this.rule.clear(); this.injuryQueued = false;
      this.ally = this.mode === 'off' ? null : Object.freeze({ x: position.x + config.offsetX, y: position.y, z: position.z + config.offsetZ });
      this.publish(null, '');
    }
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
    if (this.ally) players.push({ playerId: config.allyId, teamId: 'red', life: { status: 'downed', lifeId: 1, revision: 1 }, position: this.ally, grounded: true, connected: true });
    try {
      const snapshot = this.rule.step(this.tick++, { players, controls: [{ ...input, playerId: config.playerId, targetPlayerId: this.ally ? config.allyId : null }],
        damagedPlayerIds: damaged ? [config.playerId] : [], matchFinished: false }, (from, to) => isRescueLineClear(world, from, to));
      const channel = snapshot.channels[0] ?? null, event = snapshot.events.find(e => e.rescuerId === config.playerId);
      if (!current && channel) this.injuryQueued = false;
      let message = this.state.message;
      if (channel) message = channel.ready ? '3秒救援进度测试完成' : '';
      else if (event?.kind === 'interrupted') message = interruptMessage(event.reason);
      this.publish(channel, message);
      return snapshot;
    } catch (error) { this.publish(null, '救援已中断'); throw error; }
  }
  getAllyHp = () => PLAYER_LIFE_CONFIG.downedHp;
}
function interruptMessage(reason: RescueInterruptReason) {
  if (reason === 'out-of-range') return '队友已移出2米范围 · 救援中断';
  if (reason === 'damaged') return '受到伤害 · 救援中断';
  if (reason === 'blocked') return '视线被遮挡 · 救援中断';
  if (reason === 'released') return '已松开 E · 进度清零';
  return '救援已中断，请松开 E 后重试';
}
