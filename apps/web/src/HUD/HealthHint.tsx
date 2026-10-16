import { useSyncExternalStore } from 'react';
import type { CSSProperties } from 'react';
import type { LocalPlayerHealth } from '../player/LocalPlayerHealth';

/** Current block avatar portrait; replace its art with the B.3/7.2 character render later. */
function PlayerPortrait({ downed }: { downed: boolean }) {
  return <svg viewBox="0 0 120 130" className="player-portrait" aria-hidden="true">
    <defs><linearGradient id="portrait-hood" x2=".8" y2="1"><stop stopColor="#ffab87"/><stop offset="1" stopColor="#b6403d"/></linearGradient></defs>
    <path d="M25 130V102Q26 87 43 86H77Q95 88 96 105V130" fill="#df6355" stroke="#823d3b" strokeWidth="3"/>
    <path d="M46 94L59 109L74 94M59 110V130" fill="none" stroke="#ffe1aa" strokeWidth="7"/>
    <path d="M24 107L8 113L12 126L32 120M91 107L111 116L105 129L87 119" fill="#fff5df" stroke="#b4d7d9" strokeWidth="3"/>
    <path d="M15 49Q14 6 58 6Q104 3 106 47L101 76Q83 99 57 97Q25 95 17 76Z" fill="url(#portrait-hood)" stroke="#823d3b" strokeWidth="3"/>
    <ellipse cx="60" cy="61" rx="35" ry="29" fill="#ffe5bf" stroke="#b25640" strokeWidth="2"/>
    {downed ? <path d="M39 53L48 62M48 53L39 62M72 53L81 62M81 53L72 62" stroke="#373a47" strokeWidth="4" strokeLinecap="round"/> : <>
      <path d="M36 48L49 51M70 51L83 48" stroke="#573d3b" strokeWidth="4" strokeLinecap="round"/>
      <rect x="42" y="55" width="6" height="13" rx="3" fill="#253e4e"/><rect x="73" y="55" width="6" height="13" rx="3" fill="#253e4e"/></>}
    <path d={downed ? 'M53 78Q61 71 69 78' : 'M54 76Q61 82 69 74'} fill="none" stroke="#9b4e44" strokeWidth="3" strokeLinecap="round"/>
    <path d="M25 36Q32 15 51 15" stroke="#ffcfac" strokeWidth="5" strokeLinecap="round" fill="none"/>
  </svg>;
}
export function HealthHint({ player }: { player: LocalPlayerHealth }) {
  const state = useSyncExternalStore(player.subscribe, player.getSnapshot);
  const downed = state.status === 'downed', eliminated = state.status === 'eliminated' || state.status === 'respawning';
  const hp = state.hp, maxHp = state.maxHp;
  const label = state.status === 'respawning' ? '正在复活' : eliminated ? '已淘汰' : downed ? '困泡' : state.protected ? '保护中' : 'HP';
  return <output className={`combat-health ${downed ? 'downed' : ''} ${eliminated ? 'eliminated' : ''} ${state.protected ? 'protected' : ''}`}
    aria-label={`自身${downed ? '困泡' : ''} HP：${hp} / ${maxHp}`} style={{ '--hp-level': `${hp / maxHp * 100}%` } as CSSProperties}>
    <div className="health-globe"><div key={`${state.lifeId}-${player.getDamageRevision()}`} className={state.lastDamage > 0 ? 'portrait-reaction' : ''}><PlayerPortrait downed={downed || eliminated} /></div>
      <div className="health-water" aria-hidden="true"><i /></div><div className="globe-shine" aria-hidden="true" /></div>
    <div className="globe-hp"><span>{label}</span>{!downed && <b>{hp}</b>}</div>
  </output>;
}
