import type { RescueControl } from '@bubble-arena/shared';
export type RescueInputState = Omit<RescueControl, 'playerId' | 'targetPlayerId'>;
type Action = 'move' | 'jump' | 'fire' | 'reload' | 'weaponSwitch' | 'aim';
const bindings: Record<string, Action> = { KeyW: 'move', KeyA: 'move', KeyS: 'move', KeyD: 'move', Space: 'jump', KeyR: 'reload', Digit1: 'weaponSwitch', Digit2: 'weaponSwitch' };
const editable = (target: EventTarget | null) => {
  const element = target as HTMLElement | null;
  return Boolean(element?.isContentEditable || element?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"])'));
};
/** Captures E and interruption attempts even when weapon/movement execution is gated. */
export class RescueInput {
  private held = false;
  private readonly keys = new Set<string>();
  private readonly queued = new Set<Action>();
  private readonly buttons = new Set<Action>();
  private active = () => false;
  private detachCurrent?: () => void;
  clear = () => { this.held = false; this.keys.clear(); this.queued.clear(); this.buttons.clear(); };
  consume(): RescueInputState {
    const result = { held: this.held, active: this.active(), move: false, jump: false, fire: false, reload: false, weaponSwitch: false, aim: false };
    for (const key of this.keys) result[bindings[key]] = true;
    for (const action of this.queued) result[action] = true;
    for (const action of this.buttons) result[action] = true;
    this.queued.clear(); return Object.freeze(result);
  }
  attach(canvas: EventTarget, global: EventTarget, doc: EventTarget & { hidden?: boolean }, enabled = () => true, cancel = () => {}, fireGesture = () => true) {
    this.detachCurrent?.(); this.clear();
    this.active = () => enabled() && !doc.hidden;
    const stop = () => { this.clear(); cancel(); };
    const down = (event: Event) => {
      const e = event as KeyboardEvent;
      if (e.code === 'Escape') { stop(); return; }
      if (!this.active() || e.ctrlKey || e.metaKey || e.altKey || e.isComposing || editable(e.target)) return;
      if (e.code === 'KeyE') { e.preventDefault(); if (!e.repeat) this.held = true; }
      else if (Object.hasOwn(bindings, e.code)) { this.keys.add(e.code); this.queued.add(bindings[e.code]); }
    };
    const up = (event: Event) => { const code = (event as KeyboardEvent).code; if (code === 'KeyE') this.held = false; this.keys.delete(code); };
    const mouseDown = (event: Event) => {
      const e = event as MouseEvent;
      if (!this.active() || e.ctrlKey || e.metaKey || e.altKey) return;
      const action = e.button === 2 ? 'aim' : e.button === 0 && fireGesture() ? 'fire' : null;
      if (action) { this.buttons.add(action); this.queued.add(action); }
    };
    const mouseUp = (event: Event) => { if ((event as MouseEvent).button === 0) this.buttons.delete('fire'); if ((event as MouseEvent).button === 2) this.buttons.delete('aim'); };
    const move = (event: Event) => { const buttons = (event as MouseEvent).buttons; if (!(buttons & 1)) this.buttons.delete('fire'); if (!(buttons & 2)) this.buttons.delete('aim'); };
    const hidden = () => { if (doc.hidden) stop(); };
    const focus = (event: Event) => { if (editable(event.target)) stop(); };
    global.addEventListener('keydown', down); global.addEventListener('keyup', up); global.addEventListener('blur', stop);
    global.addEventListener('mouseup', mouseUp); global.addEventListener('mousemove', move);
    canvas.addEventListener('mousedown', mouseDown); doc.addEventListener('visibilitychange', hidden); doc.addEventListener('focusin', focus);
    let attached = true;
    const detach = () => {
      if (!attached) return; attached = false;
      global.removeEventListener('keydown', down); global.removeEventListener('keyup', up); global.removeEventListener('blur', stop);
      global.removeEventListener('mouseup', mouseUp); global.removeEventListener('mousemove', move);
      canvas.removeEventListener('mousedown', mouseDown); doc.removeEventListener('visibilitychange', hidden); doc.removeEventListener('focusin', focus);
      if (this.detachCurrent === detach) { this.detachCurrent = undefined; this.active = () => false; stop(); }
    };
    this.detachCurrent = detach; return detach;
  }
}
