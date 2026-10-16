import { MATCH_CONFIG, ARENA_CONFIG, parseArenaBotSeats, parseArenaSeat, DEFAULT_ARENA_PLAYER_SEAT, type ArenaBotSeat } from '@bubble-arena/shared';

export const ROOM_MODES = { arena: { label: '基地对抗', map: ARENA_CONFIG.name } } as const;
export type RoomMode = keyof typeof ROOM_MODES;
export type RoomPreset = 'standard';
export interface LocalRoom { readonly id: string; readonly name: string; readonly mode: RoomMode; readonly preset: RoomPreset; readonly bots: readonly ArenaBotSeat[]; readonly playerSeat: ArenaBotSeat }
/** Immutable local launch intent; never supplies authoritative coordinates, damage or score. */
export interface GameLaunch extends LocalRoom { readonly matchId: string }
export interface LobbyState {
  readonly page: 'home' | 'rooms' | 'room' | 'game'; readonly room: LocalRoom | null;
  readonly launch: GameLaunch | null; readonly sequence: number; readonly error: string | null;
}
export const INITIAL_LOBBY: LobbyState = { page: 'home', room: null, launch: null, sequence: 0, error: null };
export type LobbyAction =
  | { type: 'open-rooms' | 'go-home' | 'enter-room' | 'leave-room' | 'close-room' | 'start' | 'clear-error' | 'return-room' }
  | { type: 'create'; name: string }
  | { type: 'add-bot' | 'remove-bot' | 'move-seat'; seat: ArenaBotSeat };
export function roomNameError(value: string): string | null {
  const name = value.trim();
  if (/[\p{Cc}<>]/u.test(name)) return '房间名不能包含控制字符或尖括号。';
  return [...name].length < 2 || [...name].length > 24 ? '房间名需要 2～24 个字符。' : null;
}
export function roomMatchConfig(preset: RoomPreset) { if (preset !== 'standard') throw new TypeError('Invalid room rules'); return MATCH_CONFIG; }
export function canStartRoom(room: LocalRoom) { return room.mode === 'arena' && room.preset === 'standard' && room.bots.some(b => b.teamId !== room.playerSeat.teamId); }
export function lobbyReducer(state: LobbyState, action: LobbyAction): LobbyState {
  switch (action.type) {
    case 'open-rooms': return state.page === 'home' ? { ...state, page: 'rooms', error: null } : state;
    case 'go-home': return state.page === 'rooms' ? { ...state, page: 'home', error: null } : state;
    case 'clear-error': return state.error ? { ...state, error: null } : state;
    case 'create': {
      if (state.page !== 'rooms' || state.room) return state;
      const error = roomNameError(action.name); if (error) return { ...state, error };
      const sequence = state.sequence + 1;
      return { ...state, sequence, page: 'room', error: null, room: Object.freeze({ id: `LOCAL-${String(sequence).padStart(3, '0')}`, name: action.name.trim(), mode: 'arena', preset: 'standard', bots: parseArenaBotSeats([]), playerSeat: DEFAULT_ARENA_PLAYER_SEAT }) };
    }
    case 'enter-room': return state.page === 'rooms' && state.room ? { ...state, page: 'room', error: null } : state;
    case 'leave-room': return state.page === 'room' ? { ...state, page: 'rooms', room: null, launch: null, error: null } : state;
    case 'close-room': return state.page === 'room' || state.page === 'rooms' ? { ...state, page: 'rooms', room: null, launch: null, error: null } : state;
    case 'add-bot': case 'remove-bot': {
      if (state.page !== 'room' || !state.room) return state;
      try {
        const [seat] = parseArenaBotSeats([action.seat], state.room.playerSeat);
        const has = state.room.bots.some(b => b.teamId === seat.teamId && b.slot === seat.slot);
        if (has === (action.type === 'add-bot')) return state;
        const bots = parseArenaBotSeats(action.type === 'add-bot' ? [...state.room.bots, seat] : state.room.bots.filter(b => b.teamId !== seat.teamId || b.slot !== seat.slot), state.room.playerSeat);
        return { ...state, room: Object.freeze({ ...state.room, bots }), error: null };
      } catch { return { ...state, error: '席位不可用' }; }
    }
    case 'move-seat': {
      if(state.page!=='room'||!state.room)return state;
      try{
        const seat=parseArenaSeat(action.seat),old=state.room.playerSeat;
        if(seat.teamId===old.teamId&&seat.slot===old.slot)return state;
        if(state.room.bots.some(b=>b.teamId===seat.teamId&&b.slot===seat.slot))return state;
        const bots=parseArenaBotSeats(state.room.bots,seat);
        return {...state,room:Object.freeze({...state.room,playerSeat:seat,bots}),error:null};
      }catch{return {...state,error:'席位不可用'};}
    }
    case 'start': {
      if (state.page !== 'room' || !state.room || !canStartRoom(state.room)) return state;
      const sequence = state.sequence + 1;
      return { ...state, page: 'game', sequence, error: null, launch: Object.freeze({ ...state.room, bots: parseArenaBotSeats(state.room.bots, state.room.playerSeat), matchId: `${state.room.id}-MATCH-${sequence}` }) };
    }
    case 'return-room': return state.page === 'game' && state.room ? { ...state, page: 'room', launch: null, error: null } : state;
    default: return state;
  }
}
