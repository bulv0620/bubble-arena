import { useEffect, useRef } from 'react';
import { MOUSE_SETTINGS } from './mouseSettings';
import { HUD_SETTINGS } from './hudSettings';
import './settings.css';

export function SettingsPanel({ speed, onSpeed, hudScale, onHudScale, onExit, onReturn }: {
  hudScale: number; onHudScale: (value: number) => void;
  speed: number; onSpeed: (value: number) => void; onExit: () => void; onReturn: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => { panel.current?.querySelector<HTMLInputElement>('input')?.focus(); }, []);
  return <div className="settings-overlay">
    <div ref={panel} className="settings-panel" role="dialog" aria-modal="true" aria-label="游戏设置" aria-labelledby="settings-title" onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const controls = panel.current?.querySelectorAll<HTMLElement>('input:not(:disabled), select:not(:disabled), button:not(:disabled)');
      if (!controls?.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }}>
      <header className="settings-header"><h1 id="settings-title">游戏设置</h1></header>
      <div className="settings-body">
      <label htmlFor="mouse-speed">鼠标速度 <output>{speed.toFixed(2)}×</output></label>
      <input id="mouse-speed" type="range" min={MOUSE_SETTINGS.min} max={MOUSE_SETTINGS.max} step={MOUSE_SETTINGS.step} value={speed} onChange={event => onSpeed(Number(event.target.value))} />
      <label htmlFor="hud-scale">HUD 缩放 <output>{Math.round(hudScale * 100)}%</output></label>
      <input id="hud-scale" type="range" min={HUD_SETTINGS.min} max={HUD_SETTINGS.max} step={HUD_SETTINGS.step} value={hudScale} onChange={event => onHudScale(Number(event.target.value))} />
      </div><footer className="settings-footer">
      <div className="settings-actions"><button onClick={onExit}>退出游戏</button><button className="settings-return" onClick={onReturn}>返回游戏</button></div>
      </footer>
    </div>
  </div>;
}
