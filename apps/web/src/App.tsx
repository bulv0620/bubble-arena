import { Component, lazy, Suspense, useReducer, type ReactNode } from 'react';
import { LobbyPages } from './lobby/LobbyPages';
import { INITIAL_LOBBY, lobbyReducer, ROOM_MODES } from './lobby/localRoom';
import './HUD/gameHud.css';
import './HUD/gameTheme.css';
import './HUD/combatHud.css';

const GameScene = lazy(() => import('./core/BasicScene').then(module => ({ default: module.BasicScene })));

export default function App() {
  const [state, dispatch] = useReducer(lobbyReducer, INITIAL_LOBBY);
  if (state.page !== 'game' || !state.launch) return <LobbyPages state={state} dispatch={dispatch} />;
  const back = () => dispatch({ type: 'return-room' });
  return <GameBoundary key={state.launch.matchId} onBack={back}>
    <Suspense fallback={<main className="game-loading lobby-shell"><div className="lobby-board"><img src="/ui/bubble-mascot-v1.png" alt="" /><h1>水枪就位，马上出发！</h1><p role="status">正在准备{ROOM_MODES[state.launch.mode].map}…</p><button className="lobby-button quiet" onClick={back}>返回房间</button></div></main>}>
      <main className="scene" aria-label="Bubble Arena · 游戏场景"><GameScene launch={state.launch} onLeaveRoom={back} /></main>
    </Suspense>
  </GameBoundary>;
}

class GameBoundary extends Component<{ children: ReactNode; onBack: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <main className="game-loading lobby-shell"><div className="lobby-board" role="alert"><h1>对局没能顺利载入</h1><p>可以先返回房间，或刷新页面重新加载资源。</p><button className="lobby-button quiet" onClick={this.props.onBack}>返回房间</button><button className="lobby-button primary" onClick={() => window.location.reload()}>刷新页面</button></div></main> : this.props.children;
  }
}
