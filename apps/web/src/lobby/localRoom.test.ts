import { describe, expect, it } from 'vitest';
import { INITIAL_LOBBY, lobbyReducer, roomMatchConfig, roomNameError, type LobbyAction } from './localRoom';
const created = () => lobbyReducer(lobbyReducer(INITIAL_LOBBY, { type: 'open-rooms' }), { type: 'create', name: ' 夏日泡泡房 ' });
const withOpponent = () => lobbyReducer(created(), { type: 'add-bot', seat: { teamId: 'blue', slot: 0 } });
describe('local room flow', () => {
  it('starts at an empty list and creates only a host, without automatic bots', () => {
    const rooms = lobbyReducer(INITIAL_LOBBY, { type: 'open-rooms' });
    expect(rooms).toMatchObject({ page: 'rooms', room: null, launch: null });
    expect(lobbyReducer(rooms, { type: 'go-home' }).page).toBe('home');
    expect(created().room).toMatchObject({ name: '夏日泡泡房', bots: [], mode: 'arena', preset: 'standard' });
    const empty = created(); expect(lobbyReducer(empty, { type: 'start' })).toBe(empty);
  });
  it('validates code points, trims names and rejects control / HTML characters', () => {
    for (const name of ['', 'a', 'x'.repeat(25), '<script>', 'a\nb', 'a\u007fb']) expect(roomNameError(name)).not.toBeNull();
    expect(roomNameError('🫧'.repeat(24))).toBeNull();
    expect(lobbyReducer(lobbyReducer(INITIAL_LOBBY, { type: 'open-rooms' }), { type: 'create', name: 'x' }).error).toBeTruthy();
  });
  it('adds/removes individual seats up to real 4v4 and protects the host/duplicate/invalid slots', () => {
    let room = created();
    for (const teamId of ['red', 'blue'] as const) for (let slot = teamId==='red'?1:0; slot<4; slot++) room = lobbyReducer(room,{type:'add-bot',seat:{teamId,slot}});
    expect(room.room?.bots).toHaveLength(7);
    expect(lobbyReducer(room,{type:'add-bot',seat:{teamId:'blue',slot:3}})).toBe(room);
    for (const seat of [{teamId:'red',slot:0},{teamId:'blue',slot:4},{teamId:'green',slot:0},{teamId:'red',slot:-1}]) {
      for (const type of ['add-bot','remove-bot']) {
        const invalid=lobbyReducer(room,{type,seat} as LobbyAction); expect(invalid.room).toBe(room.room); expect(invalid.error).toBeTruthy();
      }
    }
    const removed=lobbyReducer(room,{type:'remove-bot',seat:{teamId:'blue',slot:2}}); expect(removed.room?.bots).toHaveLength(6);
    expect(removed.room?.bots.some(b=>b.teamId==='blue'&&b.slot===2)).toBe(false);
  });
  it('launches an isolated roster snapshot and rejects duplicate/in-game mutation', () => {
    const room=withOpponent(), game=lobbyReducer(room,{type:'start'});
    expect(game.launch).toMatchObject({mode:'arena',preset:'standard',bots:[{teamId:'blue',slot:0}]});
    expect(game.launch).not.toBe(room.room); expect(game.launch?.bots).not.toBe(room.room?.bots);
    for(const action of [{type:'start'},{type:'close-room'},{type:'create',name:'another'},{type:'add-bot',seat:{teamId:'red',slot:1}},{type:'remove-bot',seat:{teamId:'blue',slot:0}}] as const) expect(lobbyReducer(game,action)).toBe(game);
    expect(Object.isFrozen(game.launch?.bots)).toBe(true);
  });
  it('returns with the same roster and generates a new match identity', () => {
    const first=lobbyReducer(withOpponent(),{type:'start'}), returned=lobbyReducer(first,{type:'return-room'});
    expect(returned.room).toBe(first.room); expect(returned.launch).toBeNull();
    expect(lobbyReducer(returned,{type:'start'}).launch?.matchId).not.toBe(first.launch?.matchId);
    expect(lobbyReducer(returned,{type:'return-room'})).toBe(returned);
  });
  it('dissolves the local room when the sole human leaves, even if bots remain', () => {
    const room=withOpponent(), list=lobbyReducer(room,{type:'leave-room'});
    expect(list.room).toBeNull();expect(list.page).toBe('rooms');expect(lobbyReducer(list,{type:'enter-room'})).toBe(list);
    expect(lobbyReducer(list,{type:'create',name:'新房间'}).room?.id).not.toBe(room.room?.id);
  });
  it('allows moving into all eight empty seats, leaves the old one empty without a host readiness step', () => {
    let room=created();
    for(const teamId of ['red','blue'] as const)for(let slot=0;slot<4;slot++){
      const same=room.room?.playerSeat.teamId===teamId&&room.room.playerSeat.slot===slot;
      const previous=room;
      room=lobbyReducer(room,{type:'move-seat',seat:{teamId,slot}});
      expect(room.room?.playerSeat).toEqual({teamId,slot});expect(room.room?.bots).toEqual([]);
      if(same)expect(room).toBe(previous);
    }
    const allOneTeam=lobbyReducer(created(),{type:'add-bot',seat:{teamId:'red',slot:1}});
    expect(lobbyReducer(allOneTeam,{type:'start'})).toBe(allOneTeam);
  });
  it('rejects an occupied destination without swapping, changing the roster, including stale intents and a full room', () => {
    const room=withOpponent(),occupied={teamId:'blue',slot:0} as const;
    expect(lobbyReducer(room,{type:'move-seat',seat:occupied})).toBe(room);
    const moved=lobbyReducer(room,{type:'move-seat',seat:{teamId:'blue',slot:1}});
    expect(moved.room).toMatchObject({playerSeat:{teamId:'blue',slot:1},bots:[occupied]});
    const refill=lobbyReducer(moved,{type:'add-bot',seat:{teamId:'red',slot:0}});
    expect(lobbyReducer(refill,{type:'move-seat',seat:{teamId:'red',slot:0}})).toBe(refill);
    const game=lobbyReducer(room,{type:'start'});expect(lobbyReducer(game,{type:'move-seat',seat:{teamId:'red',slot:1}})).toBe(game);
    let full=created();for(const teamId of ['red','blue'] as const)for(let slot=teamId==='red'?1:0;slot<4;slot++)full=lobbyReducer(full,{type:'add-bot',seat:{teamId,slot}});
    for(const seat of full.room!.bots)expect(lobbyReducer(full,{type:'move-seat',seat})).toBe(full);
    for(const seat of [{teamId:'blue',slot:4},{teamId:'green',slot:0},{teamId:'red',slot:-1}]){
      const rejected=lobbyReducer(room,{type:'move-seat',seat} as LobbyAction);expect(rejected.room).toBe(room.room);expect(rejected.error).toBeTruthy();
    }
  });
  it('uses only the fixed 300s/20pt match and ignores actions from wrong pages', () => {
    expect(roomMatchConfig('standard')).toMatchObject({durationSeconds:300,scoreLimit:20});
    expect(()=>roomMatchConfig('quick' as 'standard')).toThrow();
    for(const type of ['start','enter-room','leave-room','close-room','return-room','go-home'] as const) expect(lobbyReducer(INITIAL_LOBBY,{type})).toBe(INITIAL_LOBBY);
    const rooms=lobbyReducer(INITIAL_LOBBY,{type:'open-rooms'}); expect(lobbyReducer(rooms,{type:'add-bot',seat:{teamId:'blue',slot:0}})).toBe(rooms);
  });
});

it('host can start directly whenever both teams have members, including after seat and bot changes', () => {
  const room=withOpponent();expect(room.room).not.toHaveProperty('ready');
  expect(lobbyReducer(room,{type:'start'}).page).toBe('game');
  const withoutEnemy=lobbyReducer(room,{type:'remove-bot',seat:{teamId:'blue',slot:0}});
  expect(lobbyReducer(withoutEnemy,{type:'start'})).toBe(withoutEnemy);
  const moved=lobbyReducer(room,{type:'move-seat',seat:{teamId:'blue',slot:1}});
  expect(lobbyReducer(moved,{type:'start'})).toBe(moved);
  const opposed=lobbyReducer(moved,{type:'add-bot',seat:{teamId:'red',slot:0}});
  const game=lobbyReducer(opposed,{type:'start'});expect(game.page).toBe('game');expect(game.launch?.playerSeat).toEqual({teamId:'blue',slot:1});
  expect(lobbyReducer(lobbyReducer(game,{type:'return-room'}),{type:'start'}).page).toBe('game');
});
