import { WEAPON_IDS, weaponSlot, weaponForSlot, type WeaponId, type WeaponSlot } from '@bubble-arena/shared';
/** Collect intent only. Absolute selection resets earlier wheel movement; later wheel steps compose. */
export class WeaponSwitchInput {
  private queued: WeaponSlot | null = null;
  private cycles = 0;
  private detachCurrent?: () => void;
  clear = () => { this.queued = null; this.cycles = 0; };
  request = (slot: WeaponSlot) => { weaponForSlot(slot); this.queued = slot; this.cycles = 0; };
  consume = (active: WeaponId = 'rifle'): WeaponSlot | null => {
    const result = this.queued !== null || this.cycles !== 0
      ? ((this.queued ?? weaponSlot(active)) - 1 + this.cycles + WEAPON_IDS.length) % WEAPON_IDS.length + 1 as WeaponSlot : null;
    this.clear(); return result;
  };
  attach(global: EventTarget, doc: EventTarget & { hidden?: boolean }, enabled = () => true, canvas?: EventTarget) {
    this.detachCurrent?.(); this.clear();
    let accumulated = 0, lastStep = -Infinity, lastEvent = -Infinity, direction = 0;
    const reset = () => { this.clear(); accumulated = 0; lastStep = lastEvent = -Infinity; direction = 0; };
    const editable = (target: EventTarget | null) => Boolean((target as HTMLElement | null)?.isContentEditable
      || (target as HTMLElement | null)?.closest?.('input, textarea, select, button, [contenteditable]:not([contenteditable="false"])'));
    const down = (event: Event) => {
      const key = event as KeyboardEvent;
      if (key.code === 'Escape') { reset(); return; }
      if (!enabled() || doc.hidden || key.repeat || key.isComposing || key.ctrlKey || key.altKey || key.metaKey || editable(key.target)) return;
      const digit = /^(?:Digit|Numpad)([1-4])$/.exec(key.code)?.[1];
      if (digit) { key.preventDefault(); this.request(Number(digit) as WeaponSlot); }
    };
    const wheel = (event: Event) => {
      const value = event as WheelEvent;
      if (!enabled() || doc.hidden || value.ctrlKey || value.altKey || value.metaKey || !Number.isFinite(value.deltaY) || value.deltaY === 0) return;
      if (editable(value.target)) return;
      value.preventDefault();
      const sign = Math.sign(value.deltaY), time = value.timeStamp;
      if (time - lastEvent > 180 || sign !== direction || time < lastEvent) accumulated = 0;
      if (sign !== direction) lastStep = -Infinity;
      direction = sign; lastEvent = time;
      accumulated += value.deltaY * (value.deltaMode === 1 ? 40 : value.deltaMode === 2 ? 800 : 1);
      if (Math.abs(accumulated) < 40 || time - lastStep < 120) return;
      // One queued step per physics frame. Never modulo a burst back to the same slot.
      this.cycles = sign; accumulated = 0; lastStep = time;
    };
    const hidden = () => { if (doc.hidden) reset(); };
    const focus = (event: Event) => { if (editable(event.target)) reset(); };
    global.addEventListener('keydown', down); global.addEventListener('blur', reset);
    doc.addEventListener('visibilitychange', hidden); doc.addEventListener('focusin', focus);
    canvas?.addEventListener('wheel', wheel, { passive: false });
    let active = true;
    const detach = () => {
      if (!active) return; active = false;
      global.removeEventListener('keydown', down); global.removeEventListener('blur', reset);
      doc.removeEventListener('visibilitychange', hidden); doc.removeEventListener('focusin', focus);
      canvas?.removeEventListener('wheel', wheel); reset();
      if (this.detachCurrent === detach) this.detachCurrent = undefined;
    };
    this.detachCurrent = detach; return detach;
  }
}
