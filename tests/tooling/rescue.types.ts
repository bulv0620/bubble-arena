import { evaluateRescueEligibility } from '../../packages/game-core/src/rescueEligibility';
import { RescueProgress } from '../../packages/game-core/src/rescueProgress';
import type { RescueEligibilityFacts } from '../../packages/shared/src/rescue';
declare const facts: RescueEligibilityFacts;
evaluateRescueEligibility('target', facts, () => true);
// @ts-expect-error An interaction target ID alone cannot provide authoritative player facts.
evaluateRescueEligibility('target', { targetPlayerId: 'target' }, () => true);
// @ts-expect-error The map query is mandatory; client success flags cannot replace it.
evaluateRescueEligibility('target', facts, true);
// @ts-expect-error Explicit authority facts require the finished gate.
evaluateRescueEligibility('target', { rescuer: facts.rescuer, target: facts.target, targetRescuerId: null }, () => true);
// @ts-expect-error Eligibility does not accept caller-provided progress/completion.
evaluateRescueEligibility('target', { ...facts, elapsedTicks: 180 }, () => true);
// @ts-expect-error Participant positions are read-only snapshots.
facts.rescuer.position.x = 100;
const progress = new RescueProgress();
// @ts-expect-error Progress requires an entire authoritative frame, not an elapsed client clock.
progress.step(0, { elapsedTicks: 180 }, () => true);
// @ts-expect-error World query cannot be replaced by a client completion flag.
progress.step(0, { players: [], controls: [], damagedPlayerIds: [], matchFinished: false }, true);
