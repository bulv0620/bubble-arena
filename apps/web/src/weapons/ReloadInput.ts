/** Keyboard intent only; like movement, R is available without pointer lock. */
export class ReloadInput {
  private held = false;
  private queued = false;
  private detachCurrent?: () => void;
  clear = () => { this.held = false; this.queued = false; };
  consume = () => { const result = this.queued; this.queued = false; return result; };
  attach(global: EventTarget, doc: EventTarget & { hidden?: boolean }, enabled = () => true) {
    this.detachCurrent?.();
    this.clear();
    const editable = (target: EventTarget | null) => {
      const element = target as HTMLElement | null;
      return Boolean(element?.isContentEditable || element?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])'));
    };
    const down = (event: Event) => {
      const key = event as KeyboardEvent;
      if (key.code === 'Escape') { this.clear(); return; }
      if (!enabled() || key.code !== 'KeyR' || key.isComposing || key.ctrlKey || key.altKey || key.metaKey || doc.hidden || editable(key.target)) return;
      key.preventDefault();
      if (!key.repeat && !this.held) this.queued = true;
      this.held = true;
    };
    const up = (event: Event) => { if ((event as KeyboardEvent).code === 'KeyR') this.held = false; };
    const hidden = () => { if (doc.hidden) this.clear(); };
    const focus = (event: Event) => { if (editable(event.target)) this.clear(); };
    global.addEventListener('keydown', down);
    global.addEventListener('keyup', up);
    global.addEventListener('blur', this.clear);
    doc.addEventListener('visibilitychange', hidden);
    doc.addEventListener('focusin', focus);
    let active = true;
    const detach = () => {
      if (!active) return;
      active = false;
      global.removeEventListener('keydown', down);
      global.removeEventListener('keyup', up);
      global.removeEventListener('blur', this.clear);
      doc.removeEventListener('visibilitychange', hidden);
      doc.removeEventListener('focusin', focus);
      this.clear();
      if (this.detachCurrent === detach) this.detachCurrent = undefined;
    };
    this.detachCurrent = detach;
    return detach;
  }
}
