import { BubbleInteractionProgress, type PlayerHealthSnapshot, type RescueChannel } from '@bubble-arena/game-core';
import { RESCUE_CONFIG, BUBBLE_INTERACTION_CONFIG, ARENA_BOT_CONFIG, type DamageActor, type RescuePosition, type RescueParticipant, type RescueControl } from '@bubble-arena/shared';
import type { World } from '@dimforge/rapier3d-compat';
import type { LocalPlayerHealth } from './LocalPlayerHealth';
import type { LocalArenaOpponent } from './LocalArenaOpponent';
import type { LocalLoadout } from '../weapons/LocalLoadout';
import type { LocalTeamScore } from './LocalTeamScore';
import type { RescueInputState } from '../input/RescueInput';
import { isRescueLineClear } from './rescueLineOfSight';
interface InteractiveHealth {
  getSnapshot(): PlayerHealthSnapshot; getDamageRevision(): number;
  completeRescue(channel: RescueChannel): boolean; finishBubble(fact: { lifeId: number; revision: number }, source: DamageActor): boolean;
}
interface Agent { actor: DamageActor; position: RescuePosition; grounded: boolean; health: InteractiveHealth }
export interface PublicBubbleRescue { readonly targetId: string; readonly rescuerId: string; readonly progress: number; readonly position: RescuePosition }
export interface ArenaInteractionSnapshot {
  readonly targetId: string | null; readonly kind: 'rescue' | 'kick' | null; readonly progress: number | null;
  readonly receiving: number | null; readonly rescues: readonly PublicBubbleRescue[];
  readonly kickSequence: number; readonly kickTick: number; readonly kickPosition: RescuePosition | null;
}
const empty = (): ArenaInteractionSnapshot => Object.freeze({ targetId: null, kind: null, progress: null, receiving: null, rescues: Object.freeze([]), kickSequence: 0, kickTick: -1, kickPosition: null });
const position = (p: RescuePosition) => ({ x: p.x, y: p.y, z: p.z });
/** One fixed-step transaction after all damage and before scoring, for human and AI. */
export class LocalArenaInteractions {
  private readonly rule = new BubbleInteractionProgress();
  private readonly listeners = new Set<() => void>();
  private readonly damage = new Map<string, number>();
  private readonly aiRest = new Map<string, number>();
  private disposed = false; private sequence = 0; private state = empty();
  constructor(private readonly player: LocalPlayerHealth, private readonly bots: readonly LocalArenaOpponent[], private readonly loadout: LocalLoadout, private readonly score: LocalTeamScore) {}
  getSnapshot = () => this.state;
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  isActing = (playerId: string) => this.rule.getSnapshot().channels.some(c => c.rescuer.playerId === playerId);
  private publish(next: ArenaInteractionSnapshot) {
    const sameRescues = next.rescues.length === this.state.rescues.length && next.rescues.every((r,i) => {
      const old = this.state.rescues[i];
      return r.targetId === old.targetId && r.rescuerId === old.rescuerId && r.progress === old.progress
        && r.position.x === old.position.x && r.position.y === old.position.y && r.position.z === old.position.z;
    });
    if (sameRescues && Object.keys(next).every(key => key === 'rescues' || next[key as keyof ArenaInteractionSnapshot] === this.state[key as keyof ArenaInteractionSnapshot])) return;
    this.state = Object.freeze(next); for (const fn of this.listeners) fn();
  }
  cancel = () => {
    this.rule.cancel(this.player.actor.playerId); this.loadout.setRescuing(false);
    this.publish({ ...this.state, targetId: null, kind: null, progress: null,
      rescues: Object.freeze(this.state.rescues.filter(c => c.rescuerId !== this.player.actor.playerId)) });
  };
  dispose = () => { if (this.disposed) return; this.cancel(); this.rule.clear(); this.disposed = true; this.damage.clear(); this.aiRest.clear(); this.state = empty(); this.listeners.clear(); };
  private agents(playerPosition: RescuePosition, grounded: boolean): readonly Agent[] {
    return [{ actor: this.player.actor, position: position(playerPosition), grounded, health: this.player }, ...this.bots.map(b => ({ actor: b.actor, position: b.getPosition(), grounded: b.grounded, health: b }))];
  }
  private nearest(world: World, self: Agent, agents: readonly Agent[], range?: number) {
    if (self.health.getSnapshot().status !== 'normal') return null;
    const channels = this.rule.getSnapshot().channels;
    return agents.filter(a => a.actor.playerId !== self.actor.playerId && a.health.getSnapshot().status === 'downed'
      && !channels.some(c => c.target.playerId === a.actor.playerId && c.rescuer.playerId !== self.actor.playerId
        && c.kind === (a.actor.teamId === self.actor.teamId ? 'rescue' : 'kick')))
      .map(a => ({ a, d: Math.hypot(a.position.x-self.position.x, a.position.y-self.position.y, a.position.z-self.position.z) }))
      .filter(e => e.d <= (range ?? (e.a.actor.teamId === self.actor.teamId ? RESCUE_CONFIG.maxDistance : BUBBLE_INTERACTION_CONFIG.kickMaxDistance)) && isRescueLineClear(world, self.position, e.a.position)).sort((a,b) => a.d-b.d || a.a.actor.playerId.localeCompare(b.a.actor.playerId))[0]?.a ?? null;
  }
  approachTarget(world: World, bot: LocalArenaOpponent, playerPosition: RescuePosition) {
    const agents = this.agents(playerPosition, true), self = agents.find(a => a.actor.playerId === bot.actor.playerId)!;
    return this.nearest(world, self, agents, ARENA_BOT_CONFIG.viewRange)?.position ?? null;
  }
  step(world: World, playerPosition: RescuePosition, grounded: boolean, input: RescueInputState) {
    if (this.disposed) return;
    if (!this.player.canPlay()) { this.rule.clear(); this.loadout.setRescuing(false); this.publish({ ...empty(), kickSequence: this.state.kickSequence }); return; }
    const tick = this.player.getTick(); if (tick < 0) return;
    const agents = this.agents(playerPosition, grounded), self = agents[0], damaged: string[] = [];
    for (const a of agents) { const revision = a.health.getDamageRevision(); if (revision !== (this.damage.get(a.actor.playerId) ?? 0)) damaged.push(a.actor.playerId); this.damage.set(a.actor.playerId, revision); }
    const humanTarget = this.nearest(world, self, agents);
    const players: RescueParticipant[] = agents.map(a => { const h = a.health.getSnapshot(); return { playerId: a.actor.playerId, teamId: a.actor.teamId,
      life: { status: h.status, lifeId: h.lifeId, revision: h.revision }, position: position(a.position), grounded: a.grounded, connected: true }; });
    const controls: RescueControl[] = agents.map(a => {
      const human = a === self, target = human ? humanTarget : this.nearest(world, a, agents);
      return { playerId: a.actor.playerId, targetPlayerId: target?.actor.playerId ?? null, active: human ? input.active : true,
        held: human ? input.held : Boolean(target && a.grounded && tick >= (this.aiRest.get(a.actor.playerId) ?? 0)),
        move: human ? input.move : false, jump: human ? input.jump : false, fire: human ? input.fire : false,
        reload: human ? input.reload : false, weaponSwitch: human ? input.weaponSwitch : false, aim: human ? input.aim : false };
    });
    let { kickPosition, kickTick, kickSequence } = this.state;
    try {
      const snapshot = this.rule.step(tick, { players, controls, damagedPlayerIds: damaged, matchFinished: false }, (a,b) => isRescueLineClear(world,a,b));
      // If both finish on the same authority tick, the kick resolves first.
      const readyEvents = [...snapshot.events].sort((a,b) => {
        const channels = snapshot.channels;
        return Number(channels.find(c=>c.rescuer.playerId===a.actorId)?.kind !== 'kick') - Number(channels.find(c=>c.rescuer.playerId===b.actorId)?.kind !== 'kick');
      });
      for (const event of readyEvents) {
        if (event.kind === 'interrupted') this.aiRest.set(event.actorId, tick + 2);
        if (event.kind !== 'ready') continue;
        this.rule.complete(tick, event.actorId, channel => {
          const target = agents.find(a => a.actor.playerId === channel.target.playerId), actor = agents.find(a => a.actor.playerId === channel.rescuer.playerId);
          if (!target || !actor) return false;
          if (channel.kind === 'kick') {
            const accepted = target.health.finishBubble({ lifeId: channel.target.lifeId, revision: channel.target.revision }, actor.actor);
            if (accepted) { kickPosition = Object.freeze(position(target.position)); kickTick = tick; kickSequence = ++this.sequence; }
            return accepted;
          }
          const accepted = target.health.completeRescue(channel);
          if (accepted) this.score.recordRescue(channel.rescuer.playerId, channel.target.playerId, channel.target.lifeId, channel.target.revision, tick);
          return accepted;
        });
      }
      const channels = this.rule.getSnapshot().channels, human = channels.find(c => c.rescuer.playerId === this.player.actor.playerId);
      const rescues = Object.freeze(channels.filter(c => c.kind === 'rescue').map(c => Object.freeze({ targetId: c.target.playerId, rescuerId: c.rescuer.playerId,
        progress: c.elapsedTicks/c.requiredTicks, position: Object.freeze(position(agents.find(a => a.actor.playerId === c.target.playerId)!.position)) })));
      this.loadout.setRescuing(Boolean(human));
      this.publish({ targetId: human?.target.playerId ?? humanTarget?.actor.playerId ?? null,
        kind: human?.kind ?? (humanTarget ? humanTarget.actor.teamId === self.actor.teamId ? 'rescue' : 'kick' : null),
        progress: human ? human.elapsedTicks/human.requiredTicks : null, receiving: rescues.find(c => c.targetId === self.actor.playerId)?.progress ?? null,
        rescues, kickPosition, kickTick, kickSequence });
    } catch (error) { this.rule.clear(); this.loadout.setRescuing(false); this.publish(empty()); throw error; }
  }
}
