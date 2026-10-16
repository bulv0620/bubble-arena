import { expect, test } from 'vitest';
import { parseArenaBotSeats, arenaBotActor } from './arenaRoster';
test('roster validates slots, duplicates, host ownership and produces eight unique actor identities', () => {
  const all=[...Array.from({length:3},(_,i)=>({teamId:'red',slot:i+1})),...Array.from({length:4},(_,i)=>({teamId:'blue',slot:i}))];
  const seats=parseArenaBotSeats(all); expect(seats).toHaveLength(7); expect(new Set(seats.map(s=>arenaBotActor(s).playerId)).size).toBe(7);
  expect(Object.isFrozen(seats)).toBe(true); expect(seats.every(Object.isFrozen)).toBe(true);
  for (const invalid of [null,{},new Array(1),[all[0],all[0]],[{teamId:'red',slot:0}],[{teamId:'red',slot:4}],[{teamId:'blue',slot:1.5}],[{teamId:'blue',slot:0,damage:100}]]) expect(()=>parseArenaBotSeats(invalid)).toThrow();
});
