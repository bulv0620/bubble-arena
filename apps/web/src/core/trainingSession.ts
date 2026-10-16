import { ARENA_SPAWNS, DEFAULT_ARENA_BOT_SEATS, parseArenaBotSeats, parseArenaSeat, DEFAULT_ARENA_PLAYER_SEAT, arenaBotActor, parseScoreRoster, type ArenaBotSeat, TRAINING_SCORE_ACTORS } from '@bubble-arena/shared';
import { LocalArenaInteractions } from '../player/LocalArenaInteractions';
import { LocalArenaOpponent } from '../player/LocalArenaOpponent';
import { ArenaTelemetry } from '../player/ArenaTelemetry';
import { CombatLog } from './CombatLog';
import { LocalMatch } from './LocalMatch';
import { LocalTeamScore } from '../player/LocalTeamScore';
import { LocalRespawn } from '../player/LocalRespawn';
import { LocalRescuePractice } from '../player/LocalRescuePractice';
import { LocalPlayerHealth } from '../player/LocalPlayerHealth';
import { ShotFeedback } from '../effects/ShotFeedback';
import { LocalTrainingRange } from '../weapons/LocalTrainingRange';
import { TrainingTargets } from '../weapons/TrainingTargets';
import { RifleRecoil } from '../weapons/RifleRecoil';
import { RifleMotion } from '../weapons/RifleMotion';
import { LocalLoadout } from '../weapons/LocalLoadout';
import { LocalBubbleFlight } from '../weapons/LocalBubbleFlight';
import type { MatchConfig, WeaponId } from '@bubble-arena/shared';

/** Replace local training data without replacing the Canvas/HTML portal host. */
export function createTrainingSession(initialWeapon: WeaponId = 'rifle', options: { match?: boolean; config?: MatchConfig; arena?: boolean; botSeats?: readonly ArenaBotSeat[]; playerSeat?: ArenaBotSeat } = {}) {
  const playerSeat = parseArenaSeat(options.playerSeat ?? DEFAULT_ARENA_PLAYER_SEAT);
  const humanActor = Object.freeze({...TRAINING_SCORE_ACTORS.player,teamId: playerSeat.teamId});
  const botSeats = parseArenaBotSeats(options.arena ? options.botSeats ?? DEFAULT_ARENA_BOT_SEATS : [], playerSeat);
  const match = new LocalMatch(options.match ?? false, options.config);
  const score = new LocalTeamScore(match.canPlay, options.arena ? parseScoreRoster([humanActor, ...botSeats.map(arenaBotActor)].map(a => ({ ...a, lifeId: 1 }))) : undefined), loadout = new LocalLoadout(initialWeapon, match.canPlay), targets = new TrainingTargets(), playerHealth = new LocalPlayerHealth(score, match.canPlay, options.arena, humanActor);
  const rescue = new LocalRescuePractice(playerHealth, loadout, score), recoil = new RifleRecoil(), feedback = new ShotFeedback(), motion = new RifleMotion(loadout);
  const range = new LocalTrainingRange(), bubbles = new LocalBubbleFlight(targets, playerHealth.canCauseControl);
  const bots = botSeats.map(seat => new LocalArenaOpponent(score, match.canPlay, seat, humanActor));
  const opponent = bots.find(b => b.actor.teamId !== humanActor.teamId) ?? null, opponentFeedback = opponent?.feedback ?? new ShotFeedback(), telemetry = new ArenaTelemetry();
  const interactions = new LocalArenaInteractions(playerHealth,bots,loadout,score);
  const combatLog = new CombatLog();
  combatLog.bind(playerHealth, humanActor);
  bots.forEach(bot => combatLog.bind(bot, bot.actor));
  const inputResets = new Set<() => void>();
  let disposed = false;
  return {
    bindInputReset(reset: () => void) {
      if (typeof reset !== 'function') throw new TypeError('Invalid session input reset');
      if (disposed) return () => {};
      inputResets.add(reset); return () => { inputResets.delete(reset); };
    },
    dispose() {
      if (disposed) return; disposed = true; match.dispose();
      for (const reset of inputResets) reset(); inputResets.clear();
      combatLog.dispose(); interactions.dispose(); bots.forEach(bot => bot.dispose()); telemetry.dispose(); playerHealth.clearPending(); rescue.dispose(); bubbles.clear(); targets.dispose(); feedback.clear(); opponentFeedback.clear(); recoil.reset(); motion.reset();
      for (const entry of range.entries) entry.target.damageNumbers.clear();
    },
    combatLog, interactions, playerSeat, botSeats, bots, arena: Boolean(options.arena), opponent, telemetry, match, score, range, targets, bubbles, playerHealth, rescue, respawn: new LocalRespawn(playerHealth, loadout, rescue, motion, feedback, recoil, options.arena ? ARENA_SPAWNS : undefined, () => bots.map(b => ({ playerId: b.actor.playerId, team: b.actor.teamId, status: b.getSnapshot().status, position: b.getPosition() }))),
    recoil, feedback, opponentFeedback, motion, loadout,
  };
}

/** Replace the entire per-match identity scope; never carry ready/actions into the next match. */
export function restartTrainingSession(previous: ReturnType<typeof createTrainingSession>) {
  const next = createTrainingSession(previous.loadout.getSnapshot().active, { match: previous.match.enabled, config: previous.match.rule.config, arena: previous.arena, botSeats: previous.botSeats, playerSeat: previous.playerSeat });
  previous.dispose(); return next;
}
