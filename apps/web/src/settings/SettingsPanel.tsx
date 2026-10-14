import { useEffect, useRef, type ReactNode } from 'react';
import { MOUSE_SETTINGS } from './mouseSettings';
import './settings.css';
import { PRIMARY_WEAPON_IDS, WEAPON_HANDLING, weaponGroundSpeed, type PrimaryWeaponId } from '@bubble-arena/shared';

export function SettingsPanel({ speed, onSpeed, onReset, onReturn, primary, onPrimary, lifeTest, primaryDisabled = false }: {
  speed: number; onSpeed: (value: number) => void; onReset: () => void; onReturn: () => void;
  primary: PrimaryWeaponId; onPrimary: (id: PrimaryWeaponId) => void; lifeTest?: ReactNode; primaryDisabled?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => { panel.current?.querySelector<HTMLInputElement>('input')?.focus(); }, []);
  return <div className="settings-overlay">
    <div ref={panel} className="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title" onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const controls = panel.current?.querySelectorAll<HTMLElement>('input, select, button');
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
      <label className="settings-weapon-label" htmlFor="primary-weapon">主武器 · 槽位 1</label>
      <select disabled={primaryDisabled} id="primary-weapon" value={primary} onChange={event => onPrimary(event.target.value as PrimaryWeaponId)}>
        {PRIMARY_WEAPON_IDS.map(id => <option key={id} value={id}>{WEAPON_HANDLING[id].label} · 重量 {WEAPON_HANDLING[id].weight} · {weaponGroundSpeed(id)} m/s</option>)}
      </select>
      <small>槽位 2 固定携带泡泡发射器 · 4 发弹匣<br />游戏中按 1 / 2 切换，弹药分别保留。</small>
      {lifeTest}
      <p>Esc 打开设置 · 返回游戏后锁定鼠标</p>
      <div className="settings-actions"><button onClick={onReset}>重置训练</button><button className="settings-return" onClick={onReturn}>返回游戏</button></div>
      <small>重置恢复出生位置、靶子和弹药，保留鼠标速度与所选主武器。</small>
    </div>
  </div>;
}
