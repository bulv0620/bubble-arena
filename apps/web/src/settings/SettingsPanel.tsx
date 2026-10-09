import { useEffect, useRef } from 'react';
import { MOUSE_SETTINGS } from './mouseSettings';
import './settings.css';

export function SettingsPanel({ speed, onSpeed, onReset, onReturn }: {
  speed: number; onSpeed: (value: number) => void; onReset: () => void; onReturn: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => { panel.current?.querySelector<HTMLInputElement>('input')?.focus(); }, []);
  return <div className="settings-overlay">
    <div ref={panel} className="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title" onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const controls = panel.current?.querySelectorAll<HTMLElement>('input, button');
      if (!controls?.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }}>
      <span className="settings-eyebrow">BUBBLE ARENA / OPTIONS</span>
      <h1 id="settings-title">游戏设置</h1>
      <label htmlFor="mouse-speed">鼠标速度 <output>{speed.toFixed(2)}×</output></label>
      <input id="mouse-speed" type="range" min={MOUSE_SETTINGS.min} max={MOUSE_SETTINGS.max} step={MOUSE_SETTINGS.step} value={speed} onChange={event => onSpeed(Number(event.target.value))} />
      <div className="settings-scale"><span>慢</span><span>快</span></div>
      <p>Esc 打开设置 · 返回游戏后锁定鼠标</p>
      <div className="settings-actions"><button onClick={onReset}>重置训练</button><button className="settings-return" onClick={onReturn}>返回游戏</button></div>
      <small>重置恢复出生位置、靶子和弹药，保留鼠标速度。</small>
    </div>
  </div>;
}
