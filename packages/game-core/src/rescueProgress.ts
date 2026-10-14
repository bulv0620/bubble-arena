import { PHYSICS_CONFIG, PLAYER_LIFE_CONFIG, RESCUE_CONFIG, parsePlayerLifeConfig, parseRescueConfig, parseRescueProgressFrame,
  type RescueConfig, type PlayerLifeConfig, type RescueProgressFrame, type RescueControl, type RescueParticipant } from '@bubble-arena/shared';
import { evaluateRescueEligibility, type RescueIdentity, type RescueRejection, type RescueVisibilityQuery } from './rescueEligibility';
export interface RescueChannel {
  readonly rescuer: RescueIdentity; readonly target: RescueIdentity; readonly elapsedTicks: number; readonly requiredTicks: number; readonly ready: boolean;
}
export type RescueInterruptReason = RescueRejection | 'released' | 'inactive' | 'action' | 'damaged' | 'identity-changed' | 'target-changed' | 'tick-gap' | 'invalid';
export type RescueProgressEvent = Readonly<{ kind: 'ready'; rescuerId: string; targetId: string }>
  | Readonly<{ kind: 'interrupted'; rescuerId: string; targetId: string; reason: RescueInterruptReason }>;
export interface RescueProgressSnapshot { readonly tick: number | null; readonly channels: readonly RescueChannel[]; readonly events: readonly RescueProgressEvent[] }
const empty = (): RescueProgressSnapshot => Object.freeze({ tick: null, channels: Object.freeze([]), events: Object.freeze([]) });
const action = (c: RescueControl) => c.move || c.jump || c.fire || c.reload || c.weaponSwitch || c.aim;
const sameLife = (old: RescueIdentity, player: RescueParticipant) => old.playerId === player.playerId && old.lifeId === player.life.lifeId && old.revision === player.life.revision;
/** One whole authoritative tick: existing owners first, then new candidates in
 * stable player-ID order. Single target/actor ownership; no health mutation. */
export class RescueProgress {
  private readonly channels = new Map<string, RescueChannel>();
  private readonly owners = new Map<string, string>();
  private readonly blocked = new Set<string>();
  private state = empty();
  readonly requiredTicks: number;
  private readonly config: RescueConfig;
  constructor(config: RescueConfig = RESCUE_CONFIG, lifeConfig: PlayerLifeConfig = PLAYER_LIFE_CONFIG) {
    this.config = parseRescueConfig(config);
    this.requiredTicks = Math.ceil(parsePlayerLifeConfig(lifeConfig).rescueDuration * PHYSICS_CONFIG.tickRate);
  }
  getSnapshot = () => this.state;
  clear() { this.channels.clear(); this.owners.clear(); this.blocked.clear(); this.state = empty(); }
  private publish(tick: number, events: RescueProgressEvent[]) {
    this.state = Object.freeze({ tick, channels: Object.freeze([...this.channels.values()]), events: Object.freeze(events) });
    return this.state;
  }
  step(tick: number, frame: RescueProgressFrame, query: RescueVisibilityQuery): RescueProgressSnapshot {
    if (!Number.isSafeInteger(tick) || tick < 0) throw new RangeError('Invalid rescue tick');
    if (this.state.tick !== null && tick <= this.state.tick) return this.state;
    const events: RescueProgressEvent[] = [];
    const cancel = (id: string, reason: RescueInterruptReason) => {
      const channel = this.channels.get(id); if (!channel) return;
      this.channels.delete(id); this.owners.delete(channel.target.playerId); this.blocked.add(id);
      events.push(Object.freeze({ kind: 'interrupted', rescuerId: id, targetId: channel.target.playerId, reason }));
    };
    try {
      const current = parseRescueProgressFrame(frame);
      if (typeof query !== 'function') throw new TypeError('Expected rescue map query');
      const players = new Map(current.players.map(p => [p.playerId, p])), controls = new Map(current.controls.map(c => [c.playerId, c]));
      const damaged = new Set(current.damagedPlayerIds);
      if (this.state.tick !== null && tick !== this.state.tick + 1) for (const id of this.channels.keys()) cancel(id, 'tick-gap');
      for (const id of this.blocked) if (!players.has(id) || !controls.get(id)?.held) this.blocked.delete(id);
      const eligibility = (control: RescueControl) => evaluateRescueEligibility(control.targetPlayerId,
        { rescuer: players.get(control.playerId)!, target: control.targetPlayerId === null ? null : players.get(control.targetPlayerId) ?? null,
          targetRescuerId: control.targetPlayerId === null ? null : this.owners.get(control.targetPlayerId) ?? null, matchFinished: current.matchFinished }, query, this.config);
      const advance = (channel: RescueChannel) => {
        const elapsedTicks = Math.min(this.requiredTicks, channel.elapsedTicks + 1), ready = elapsedTicks === this.requiredTicks;
        if (ready && !channel.ready) events.push(Object.freeze({ kind: 'ready', rescuerId: channel.rescuer.playerId, targetId: channel.target.playerId }));
        return Object.freeze({ ...channel, elapsedTicks, ready });
      };
      for (const [id, channel] of this.channels) {
        const control = controls.get(id), rescuer = players.get(id), target = players.get(channel.target.playerId);
        if (current.matchFinished) { cancel(id, 'finished'); continue; }
        if (!control || !control.held) { cancel(id, 'released'); continue; }
        if (!control.active) { cancel(id, 'inactive'); continue; }
        if (action(control)) { cancel(id, 'action'); continue; }
        if (control.targetPlayerId !== channel.target.playerId) { cancel(id, 'target-changed'); continue; }
        if (!rescuer || !target) { cancel(id, 'target-missing'); continue; }
        if (damaged.has(id) || damaged.has(target.playerId)) { cancel(id, 'damaged'); continue; }
        if (!sameLife(channel.rescuer, rescuer) || !sameLife(channel.target, target)) { cancel(id, 'identity-changed'); continue; }
        const result = eligibility(control);
        if (!result.eligible) { cancel(id, result.reason); continue; }
        this.channels.set(id, advance(channel));
      }
      const candidates = [...current.controls].sort((a, b) => a.playerId < b.playerId ? -1 : a.playerId > b.playerId ? 1 : 0);
      for (const control of candidates) {
        if (current.matchFinished || this.channels.has(control.playerId) || this.blocked.has(control.playerId)
          || !control.held || !control.active || action(control) || damaged.has(control.playerId)
          || control.targetPlayerId !== null && damaged.has(control.targetPlayerId)) continue;
        const result = eligibility(control); if (!result.eligible) continue;
        const channel = advance({ rescuer: result.rescuer, target: result.target, elapsedTicks: 0, requiredTicks: this.requiredTicks, ready: false });
        this.channels.set(control.playerId, channel); this.owners.set(result.target.playerId, control.playerId);
      }
      return this.publish(tick, events);
    } catch (error) {
      // A failed world query/frame cannot leave a stale channel freezing controls.
      events.splice(0, events.length, ...events.filter(event => event.kind !== 'ready'));
      for (const id of this.channels.keys()) cancel(id, 'invalid');
      this.publish(tick, events); throw error;
    }
  }
}
