import type { WeaponSlot } from './LocalLoadout';
/** Digit keys collect slot intent only; fixed simulation consumes it. */
export class WeaponSwitchInput {
  private queued: WeaponSlot | null = null;
  private detachCurrent?: () => void;
  clear = () => { this.queued = null; };
  consume = () => { const slot = this.queued; this.queued = null; return slot; };
  attach(global: EventTarget, doc: EventTarget & { hidden?: boolean }, enabled = () => true) {
    this.detachCurrent?.(); this.clear();
    const editable = (target: EventTarget | null) => Boolean((target as HTMLElement | null)?.isContentEditable
      || (target as HTMLElement | null)?.closest?.('input, textarea, select, button, [contenteditable]:not([contenteditable="false"])'));
    const down = (event: Event) => {
      const key = event as KeyboardEvent;
      if (key.code === 'Escape') { this.clear(); return; }
      if (!enabled() || doc.hidden || key.repeat || key.isComposing || key.ctrlKey || key.altKey || key.metaKey || editable(key.target)) return;
      const slot = key.code === 'Digit1' || key.code === 'Numpad1' ? 1 : key.code === 'Digit2' || key.code === 'Numpad2' ? 2 : null;
      if (slot) { key.preventDefault(); this.queued = slot; }
    };
    const hidden = () => { if (doc.hidden) this.clear(); };
    const focus = (event: Event) => { if (editable(event.target)) this.clear(); };
    global.addEventListener('keydown', down); global.addEventListener('blur', this.clear);
    doc.addEventListener('visibilitychange', hidden); doc.addEventListener('focusin', focus);
    let active = true;
    const detach = () => {
      if (!active) return; active = false;
      global.removeEventListener('keydown', down); global.removeEventListener('blur', this.clear);
      doc.removeEventListener('visibilitychange', hidden); doc.removeEventListener('focusin', focus); this.clear();
      if (this.detachCurrent === detach) this.detachCurrent = undefined;
    };
    this.detachCurrent = detach; return detach;
  }
}
