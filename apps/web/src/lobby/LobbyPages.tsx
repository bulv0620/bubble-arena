import { useEffect, useRef, useState, type Dispatch } from 'react';
import { ARENA_TEAM_SIZE, MATCH_CONFIG, type ArenaBotSeat } from '@bubble-arena/shared';
import { ROOM_MODES, canStartRoom, roomNameError, type LobbyAction, type LobbyState, type LocalRoom } from './localRoom';
import { RoomAvatar } from './RoomAvatar';
import { RoomMapPreview } from './RoomMapPreview';
import './lobby.css';
const arenaMode = ROOM_MODES.arena;
const timeLimit = `${Math.floor(MATCH_CONFIG.durationSeconds/60).toString().padStart(2,'0')}:${(MATCH_CONFIG.durationSeconds%60).toString().padStart(2,'0')}`;
function Brand() { return <div className="lobby-brand"><i>B!</i><span>BUBBLE ARENA<small>泡泡竞技场</small></span></div>; }
export function LobbyPages({ state, dispatch }: { state: LobbyState; dispatch: Dispatch<LobbyAction> }) {
  const [creating, setCreating] = useState(false), title = useRef<HTMLHeadingElement>(null), createButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { title.current?.focus(); }, [state.page]);
  const closeDialog = () => { setCreating(false); dispatch({ type: 'clear-error' }); createButton.current?.focus(); };
  if (state.page === 'home') return <main className="lobby-shell home-screen"><header className="lobby-top"><Brand /></header><section className="home-content"><h1 ref={title} tabIndex={-1}><span>BUBBLE</span><span>ARENA<i>!</i></span></h1><button className="lobby-button primary home-start" onClick={() => dispatch({ type: 'open-rooms' })}>开始游戏 <span aria-hidden="true">▶</span></button></section></main>;
  return <main className="lobby-shell lobby-interior"><header className="lobby-top"><Brand /><span className="guest-chip">✦ 泡泡先锋</span></header>
    <div className="lobby-workspace"><div className="lobby-page-heading"><h1 ref={title} tabIndex={-1}>{state.page === 'rooms' ? '自定义房间' : state.room?.name}</h1><button className="lobby-button quiet" onClick={() => dispatch({ type: state.page === 'rooms' ? 'go-home' : 'leave-room' })}>← {state.page === 'rooms' ? '返回' : '退出房间'}</button></div>
    {state.page === 'rooms' ? <section className="lobby-board room-list-board" aria-label="房间列表"><div className="board-heading"><h2>房间 <span>{state.room ? '01' : '00'}</span></h2><button ref={createButton} className="lobby-button primary" disabled={Boolean(state.room)} onClick={() => { dispatch({ type: 'clear-error' }); setCreating(true); }}>＋ 创建房间</button></div>
      <div className="room-list-columns" aria-hidden="true"><span>房间</span><span>地图 / 玩法</span><span>人数</span></div>
      {state.room ? <button className="room-list-item" onClick={() => dispatch({ type: 'enter-room' })}><span><small>{state.room.id}</small><b>{state.room.name}</b></span><span>{arenaMode.map} <small>{arenaMode.label}</small></span><strong>{state.room.bots.length+1} / 8 <i aria-hidden="true">→</i></strong></button> : <div className="rooms-empty" aria-label="空房间列表"><span aria-hidden="true">＋</span><h3>暂无房间</h3></div>}
    </section> : state.room && <RoomPage room={state.room} dispatch={dispatch} error={state.error}/>}
    </div>{creating && <CreateRoomDialog error={state.error} onClose={closeDialog} onChange={() => dispatch({ type: 'clear-error' })} onCreate={name => { dispatch({ type: 'create', name }); if (!roomNameError(name)) setCreating(false); }}/>}</main>;
}
function RoomPage({ room, dispatch, error }: { room: LocalRoom; dispatch: Dispatch<LobbyAction>; error: string | null }) {
  return <div className="room-stage lobby-board">
    <aside className="room-player-showcase">
      <div className="showcase-name"><span>★ 房主 · {room.playerSeat.teamId==='red'?'红':'蓝'}{room.playerSeat.slot+1}</span><h2>泡泡先锋</h2></div>
      <div className="showcase-avatar"><RoomAvatar team={room.playerSeat.teamId}/></div>
      <button className="lobby-button primary room-start" disabled={!canStartRoom(room)} onClick={()=>dispatch({type:'start'})}>开始游戏 <span aria-hidden="true">▶</span></button>
    </aside>
    <section className="room-seating" aria-label="房间席位">
      <div className="room-team-grid">{(['red','blue'] as const).map(teamId=><section key={teamId} className={`room-team ${teamId}`} aria-label={teamId==='red'?'红队':'蓝队'}>
        <header><h2>{teamId==='red'?'红队':'蓝队'}</h2><b>{room.bots.filter(b=>b.teamId===teamId).length+(room.playerSeat.teamId===teamId?1:0)} / {ARENA_TEAM_SIZE}</b></header>
        <div className="room-team-seats">{Array.from({length:ARENA_TEAM_SIZE},(_,slot)=>{
          const owner=room.playerSeat.teamId===teamId&&room.playerSeat.slot===slot;
          const bot=room.bots.some(b=>b.teamId===teamId&&b.slot===slot), seat: ArenaBotSeat={teamId,slot};
          const seatName=`${teamId==='red'?'红':'蓝'}${slot+1}`;
          return <article className={`room-seat ${owner||bot?'occupied':'empty'} ${owner?'host':''}`} key={slot}>
            <div className="seat-top"><b>{seatName} {owner?'泡泡先锋':bot?'AI':''}</b>{owner?<span>★</span>:<button className={`seat-bot-control ${bot?'remove':''}`} aria-label={`${bot?'移除':'添加'}${seatName}机器人`} onClick={()=>dispatch({type:bot?'remove-bot':'add-bot',seat})}>{bot?'×':'+AI'}</button>}</div>
            {owner||bot?<><RoomAvatar team={teamId} variant={slot}/>{bot&&<span className="seat-ready"><i>READY</i></span>}</>:null}
            {!owner&&!bot&&<button className="seat-move" aria-label={`换到${seatName}`} onClick={()=>dispatch({type:'move-seat',seat})}><span aria-hidden="true">⇄</span>换位</button>}
          </article>;
        })}</div>
      </section>)}</div>
      <footer className="room-match-strip"><RoomMapPreview/><div><h3>{arenaMode.map}</h3><span>{arenaMode.label}</span></div><div className="room-rule-chips"><b>{timeLimit}</b><b>{MATCH_CONFIG.scoreLimit} 分</b><b>基地复活</b></div></footer>
      {error&&<p role="alert" className="lobby-error">{error}</p>}
    </section>
  </div>;
}
function CreateRoomDialog({ error, onClose, onCreate, onChange }: { error: string | null; onClose: () => void; onCreate: (name: string) => void; onChange: () => void }) {
  const [name,setName]=useState('泡泡先锋的房间'), form=useRef<HTMLFormElement>(null);
  useEffect(()=>{form.current?.querySelector<HTMLInputElement>('input')?.select();},[]);
  return <div className="lobby-modal-backdrop"><form ref={form} className="create-room-card lobby-board" noValidate role="dialog" aria-modal="true" aria-labelledby="create-room-title" onSubmit={e=>{e.preventDefault();onCreate(name);}} onKeyDown={e=>{
    if(e.key==='Escape'){e.preventDefault();onClose();} if(e.key==='Tab'){const items=form.current?.querySelectorAll<HTMLElement>('input,button'); if(!items?.length)return; const first=items[0],last=items[items.length-1]; if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
  }}><h2 id="create-room-title">创建房间</h2><label htmlFor="room-name">房间名称</label><input id="room-name" value={name} maxLength={48} aria-invalid={Boolean(error)} onChange={e=>{setName(e.target.value);onChange();}} autoComplete="off"/>{error&&<p className="lobby-error" role="alert">{error}</p>}<div className="create-actions"><button className="lobby-button quiet" type="button" onClick={onClose}>取消</button><button className="lobby-button primary" type="submit">创建并进入 →</button></div></form></div>;
}
