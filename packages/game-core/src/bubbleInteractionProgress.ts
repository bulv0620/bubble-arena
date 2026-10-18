import { BUBBLE_INTERACTION_CONFIG, PHYSICS_CONFIG, PLAYER_LIFE_CONFIG, RESCUE_CONFIG, parseRescueProgressFrame,
  type RescueControl, type RescueParticipant, type RescueProgressFrame } from '@bubble-arena/shared';
import type { RescueChannel } from './rescueProgress';
import type { RescueIdentity, RescueVisibilityQuery } from './rescueEligibility';
export interface BubbleInteractionChannel extends RescueChannel { readonly kind: 'rescue' | 'kick' }
export interface BubbleInteractionEvent { readonly kind: 'ready' | 'interrupted' | 'completed'; readonly actorId: string; readonly targetId: string }
const identity = (p: RescueParticipant): RescueIdentity => Object.freeze({ playerId: p.playerId, lifeId: p.life.lifeId, revision: p.life.revision });
const same = (id: RescueIdentity, p: RescueParticipant) => id.playerId === p.playerId && id.lifeId === p.life.lifeId && id.revision === p.life.revision;
const action = (c: RescueControl) => c.move || c.jump || c.fire || c.reload || c.weaponSwitch || c.aim;
const empty = () => Object.freeze({ tick: null as number | null, channels: Object.freeze([] as BubbleInteractionChannel[]), events: Object.freeze([] as BubbleInteractionEvent[]) });
/** Separate rescue/kick target slots; one actor per slot, resolved after all damage. */
export class BubbleInteractionProgress {
  private readonly channels = new Map<string, BubbleInteractionChannel>();
  private readonly owners = new Map<string, string>();
  private readonly blocked = new Set<string>();
  private readonly held = new Set<string>();
  private state = empty();
  getSnapshot = () => this.state;
  private publish(tick: number | null, events: BubbleInteractionEvent[]) {
    this.state = Object.freeze({ tick, channels: Object.freeze([...this.channels.values()]), events: Object.freeze(events) });
    return this.state;
  }
  private remove(id: string) {
    const c = this.channels.get(id); if (!c) return;
    this.channels.delete(id); this.owners.delete(`${c.kind}:${c.target.playerId}`); this.blocked.add(id);
    return c;
  }
  cancel(id: string) {
    this.remove(id); this.held.delete(id);
    this.publish(this.state.tick, []);
  }
  clear() { this.channels.clear(); this.owners.clear(); this.blocked.clear(); this.held.clear(); this.state = empty(); }
  complete(tick: number, actorId: string, apply: (channel: BubbleInteractionChannel) => boolean) {
    const channel = this.channels.get(actorId);
    if (tick !== this.state.tick || !channel?.ready) return false;
    this.remove(actorId);
    const events = this.state.events.filter(e => e.actorId !== actorId);
    try {
      const accepted = apply(channel);
      if (typeof accepted !== 'boolean') throw new TypeError('Expected interaction completion result');
      events.push(Object.freeze({ kind: accepted ? 'completed' : 'interrupted', actorId, targetId: channel.target.playerId }));
      if (accepted) for (const [id, other] of this.channels) {
        if (other.target.playerId !== channel.target.playerId) continue;
        this.remove(id);
        events.push(Object.freeze({ kind: 'interrupted', actorId: id, targetId: other.target.playerId }));
      }
      this.publish(tick, events.filter(e => e.kind !== 'ready' || this.channels.has(e.actorId))); return accepted;
    } catch (error) { events.push(Object.freeze({ kind: 'interrupted', actorId, targetId: channel.target.playerId })); this.publish(tick, events); throw error; }
  }
  step(tick: number, frame: RescueProgressFrame, query: RescueVisibilityQuery) {
    if (!Number.isSafeInteger(tick) || tick < 0) throw new RangeError('Invalid interaction tick');
    if (this.state.tick !== null && tick <= this.state.tick) return this.state;
    const events: BubbleInteractionEvent[] = [];
    const cancel = (id: string) => { const c = this.remove(id); if (c) events.push(Object.freeze({ kind: 'interrupted', actorId: id, targetId: c.target.playerId })); };
    try {
      const current = parseRescueProgressFrame(frame);
      if (typeof query !== 'function') throw new TypeError('Expected interaction map query');
      const players = new Map(current.players.map(p => [p.playerId, p])), controls = new Map(current.controls.map(c => [c.playerId, c]));
      const damaged = new Set(current.damagedPlayerIds);
      const eligible = (actor: RescueParticipant | undefined, target: RescueParticipant | undefined) => {
        if (current.matchFinished || !actor || !target || actor.playerId === target.playerId || !actor.connected || !target.connected
          || actor.teamId === null || target.teamId === null || actor.life.status !== 'normal' || target.life.status !== 'downed' || !actor.grounded) return false;
        const kind = actor.teamId === target.teamId ? 'rescue' : 'kick';
        const owner = this.owners.get(`${kind}:${target.playerId}`);
        if (owner && owner !== actor.playerId) return false;
        if (Math.hypot(actor.position.x-target.position.x, actor.position.y-target.position.y, actor.position.z-target.position.z) > (kind === 'kick' ? BUBBLE_INTERACTION_CONFIG.kickMaxDistance : RESCUE_CONFIG.maxDistance)) return false;
        const clear = query(actor.position, target.position);
        if (typeof clear !== 'boolean') throw new TypeError('Invalid interaction map query result');
        return clear;
      };
      const advance = (c: BubbleInteractionChannel) => {
        const elapsedTicks = Math.min(c.requiredTicks, c.elapsedTicks + 1), ready = elapsedTicks === c.requiredTicks;
        if (ready && !c.ready) events.push(Object.freeze({ kind: 'ready', actorId: c.rescuer.playerId, targetId: c.target.playerId }));
        return Object.freeze({ ...c, elapsedTicks, ready });
      };
      if (this.state.tick !== null && tick !== this.state.tick + 1) for (const id of this.channels.keys()) cancel(id);
      for (const [id, c] of this.channels) {
        const actor = players.get(id), target = players.get(c.target.playerId), control = controls.get(id);
        if (!control?.active || !eligible(actor, target) || !same(c.rescuer, actor!) || !same(c.target, target!)
          || (actor!.teamId === target!.teamId ? 'rescue' : 'kick') !== c.kind
          || c.kind === 'rescue' && (!control.held || action(control) || control.targetPlayerId !== c.target.playerId || damaged.has(id))) {
          cancel(id); continue;
        }
        // Kick commits on press: releasing E or trying another action cannot bypass the 0.3s lock.
        // Damage is allowed while normal; downing/elimination fails eligibility before completion.
        this.channels.set(id, advance(c));
      }
      for (const id of this.blocked) if (!controls.get(id)?.held) this.blocked.delete(id);
      for (const control of [...current.controls].sort((a,b) => a.playerId < b.playerId ? -1 : a.playerId > b.playerId ? 1 : 0)) {
        const id = control.playerId, actor = players.get(id), target = control.targetPlayerId ? players.get(control.targetPlayerId) : undefined;
        if (this.channels.has(id) || this.blocked.has(id) || !control.active || !control.held || !eligible(actor,target)) continue;
        const kind = actor!.teamId === target!.teamId ? 'rescue' : 'kick';
        if (kind === 'kick' ? this.held.has(id) || control.jump || control.fire || control.reload || control.weaponSwitch || control.aim
          : action(control) || damaged.has(id)) continue;
        const requiredTicks = Math.ceil((kind === 'kick' ? BUBBLE_INTERACTION_CONFIG.kickDuration : PLAYER_LIFE_CONFIG.rescueDuration) * PHYSICS_CONFIG.tickRate);
        const channel = advance({ kind, rescuer: identity(actor!), target: identity(target!), elapsedTicks: 0, requiredTicks, ready: false });
        this.channels.set(id, channel); this.owners.set(`${kind}:${target!.playerId}`, id);
      }
      this.held.clear(); for (const c of current.controls) if (c.held) this.held.add(c.playerId);
      return this.publish(tick, events);
    } catch (error) { for (const id of this.channels.keys()) cancel(id); this.publish(tick, events.filter(e => e.kind !== 'ready')); throw error; }
  }
}
