import { useSyncExternalStore } from 'react';
import type { CombatLog } from '../core/CombatLog';
import { arenaActorLabel, type DamageActor } from '@bubble-arena/shared';
const labels: Record<string, string> = { 'training-player': '你', 'training-enemy-a': '蓝队 AI', 'training-enemy-b': '蓝队 B', 'training-ally': '队友' };
function Name({ actor, arena }: { actor: DamageActor | null; arena: boolean }) { return <span className={actor?.teamId ?? 'neutral'}>{actor ? actor.playerId === 'training-enemy-a' && !arena ? '模拟敌人 A' : arena ? arenaActorLabel(actor.playerId) : labels[actor.playerId] ?? actor.playerId : '环境'}</span>; }
export function CombatFeed({ log, arena }: { log: CombatLog; arena: boolean }) {
  const events = useSyncExternalStore(log.subscribe, log.getSnapshot);
  return <ol className="combat-feed" aria-label="战斗事件" aria-live="polite" aria-relevant="additions">
    {events.map(event => <li key={event.id} className={event.kind}><Name actor={event.actor} arena={arena} /><b>{event.kind === 'downed' ? '击倒' : '淘汰'}</b><Name actor={event.victim} arena={arena} /></li>)}
  </ol>;
}
