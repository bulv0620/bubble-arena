import { parseDamageActor, type DamageActor } from './scoring';
import { type TeamId } from './team';
import { TRAINING_SCORE_ACTORS } from './trainingScore';
export const ARENA_TEAM_SIZE = 4;
export interface ArenaBotSeat { readonly teamId: TeamId; readonly slot: number }
export const DEFAULT_ARENA_PLAYER_SEAT: ArenaBotSeat = Object.freeze({ teamId: 'red', slot: 0 });
export function parseArenaSeat(value: unknown): ArenaBotSeat {
  if (!value || typeof value !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(value)) || Reflect.ownKeys(value).length !== 2) throw new TypeError('Invalid arena seat');
  const data = value as Record<string, unknown>;
  if (['teamId','slot'].some(key=>{const f=Object.getOwnPropertyDescriptor(data,key);return !f||!('value' in f);}) || !['red','blue'].includes(data.teamId as string)
    || typeof data.slot !== 'number' || !Number.isInteger(data.slot) || data.slot<0 || data.slot>=ARENA_TEAM_SIZE) throw new TypeError('Invalid arena seat');
  return Object.freeze({teamId:data.teamId as TeamId,slot:data.slot});
}
/** Local roster intent only; host may occupy any seat. */
export function parseArenaBotSeats(value: unknown, rawPlayerSeat: ArenaBotSeat = DEFAULT_ARENA_PLAYER_SEAT): readonly ArenaBotSeat[] {
  const playerSeat=parseArenaSeat(rawPlayerSeat);
  if (!Array.isArray(value) || Object.getPrototypeOf(value)!==Array.prototype || value.length>ARENA_TEAM_SIZE*2-1 || Reflect.ownKeys(value).length!==value.length+1) throw new TypeError('Invalid arena seats');
  const seen=new Set<string>();
  const seats=Array.from(value,(_,index)=>{
    const f=Object.getOwnPropertyDescriptor(value,String(index));if(!f||!('value' in f))throw new TypeError('Invalid arena seat entry');
    const seat=parseArenaSeat(f.value),key=`${seat.teamId}-${seat.slot}`;
    if(seen.has(key)||seat.teamId===playerSeat.teamId&&seat.slot===playerSeat.slot)throw new TypeError('Occupied arena seat');
    seen.add(key);return seat;
  });
  return Object.freeze(seats.sort((a,b)=>a.teamId.localeCompare(b.teamId)||a.slot-b.slot));
}
export const DEFAULT_ARENA_BOT_SEATS = parseArenaBotSeats([{ teamId: 'blue', slot: 0 }]);
export function arenaBotActor(seat: ArenaBotSeat): DamageActor {
  const valid = parseArenaSeat(seat);
  return valid.teamId === 'blue' && valid.slot === 0 ? TRAINING_SCORE_ACTORS['enemy-a']
    : parseDamageActor({ playerId: `arena-${valid.teamId}-${valid.slot}`, teamId: valid.teamId });
}
export function arenaActorLabel(playerId: string): string {
  if (playerId === TRAINING_SCORE_ACTORS.player.playerId) return '你';
  if (playerId === TRAINING_SCORE_ACTORS['enemy-a'].playerId) return '蓝队 1 号';
  const seat = /^arena-(red|blue)-([0-3])$/.exec(playerId);
  return seat ? `${seat[1] === 'red' ? '红队' : '蓝队'} ${Number(seat[2]) + 1} 号` : playerId;
}
