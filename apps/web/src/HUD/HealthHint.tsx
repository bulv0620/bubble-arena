import type { PlayerVitals } from '@bubble-arena/game-core';
export function HealthHint({ player }: { player: PlayerVitals }) {
  return <output aria-live="polite" style={{ position: 'absolute', top: 206, right: 12,
    pointerEvents: 'none', padding: '8px 12px', background: '#ffffffdd', borderRadius: 8 }}>
    自身 HP：{player.hp} / {player.maxHp}
  </output>;
}
