import type { PlayerVitals } from '@bubble-arena/game-core';
export function HealthHint({ player }: { player: PlayerVitals }) {
  return <output className="hud-panel player-health" aria-label={`自身 HP：${player.hp} / ${player.maxHp}`}>
    <div className="health-emblem" aria-hidden="true">✚</div>
    <div className="health-info"><small>泡泡先锋 <span>YOU</span></small>
      <div className="health-value"><b>{player.hp}</b><span> / {player.maxHp} HP</span></div>
      <div className="health-track"><i style={{ width: `${player.hp / player.maxHp * 100}%` }} /></div>
    </div>
  </output>;
}
