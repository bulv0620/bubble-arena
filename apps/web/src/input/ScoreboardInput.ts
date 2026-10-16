/** Display intent only: Tab must never release movement, fire or pointer lock. */
export class ScoreboardInput {
  private held = false;
  private listeners = new Set<() => void>();
  private detachCurrent?: () => void;
  getSnapshot = () => this.held;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private set(value: boolean) { if (value === this.held) return; this.held = value; for (const listener of this.listeners) listener(); }
  clear = () => this.set(false);
  attach(global: EventTarget, doc: EventTarget & { hidden?: boolean }, enabled: () => boolean) {
    this.detachCurrent?.();
    const key = (event: Event) => {
      const e = event as KeyboardEvent;
      if (e.code === 'Escape') { this.clear(); return; }
      if (e.code !== 'Tab') return;
      if (e.type === 'keyup') { e.preventDefault(); this.clear(); return; }
      if (!enabled() || doc.hidden || e.ctrlKey || e.altKey || e.metaKey || e.isComposing ||
        (e.target as HTMLElement | null)?.closest?.('input, textarea, select, button, [contenteditable="true"]')) return;
      e.preventDefault(); this.set(true);
    };
    const hidden = () => { if (doc.hidden) this.clear(); };
    global.addEventListener('keydown', key); global.addEventListener('keyup', key); global.addEventListener('blur', this.clear); doc.addEventListener('visibilitychange', hidden);
    let active = true;
    const detach = () => { if (!active) return; active = false;
      global.removeEventListener('keydown', key); global.removeEventListener('keyup', key); global.removeEventListener('blur', this.clear); doc.removeEventListener('visibilitychange', hidden); this.clear();
      if (this.detachCurrent === detach) this.detachCurrent = undefined;
    };
    this.detachCurrent = detach; return detach;
  }
}
