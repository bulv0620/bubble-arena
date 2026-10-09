interface AimDocument extends EventTarget {
  hidden?: boolean;
  pointerLockElement: EventTarget | null;
}

/** Held fallback or click-toggle intent; the simulation supplies the scope eligibility gate. */
export class AimInput {
  private aiming = false;
  private subscribers = new Set<() => void>();
  private detachCurrent?: () => void;
  getSnapshot = () => this.aiming;
  subscribe = (listener: () => void) => {
    this.subscribers.add(listener);
    return () => { this.subscribers.delete(listener); };
  };
  private set(value: boolean) {
    if (this.aiming === value) return;
    this.aiming = value;
    for (const listener of this.subscribers) listener();
  }
  clear = () => this.set(false);

  attach(canvas: EventTarget, global: EventTarget, doc: AimDocument, enabled = () => true, toggle = () => false, canAim = () => true) {
    this.detachCurrent?.();
    let rightHeld = false;
    const down = (event: Event) => {
      const e = event as MouseEvent;
      if (!enabled() || e.button !== 2 || e.ctrlKey || e.metaKey || e.altKey || doc.hidden
        || (doc.pointerLockElement && doc.pointerLockElement !== canvas)) return;
      e.preventDefault();
      if (toggle()) {
        if (rightHeld) return;
        rightHeld = true;
        this.set(this.aiming ? false : canAim());
      } else this.set(true);
    };
    const up = (event: Event) => { if ((event as MouseEvent).button === 2) { rightHeld = false; if (!toggle()) this.clear(); } };
    const move = (event: Event) => { if (!toggle() && !((event as MouseEvent).buttons & 2)) this.clear(); };
    const cancel = () => { rightHeld = false; this.clear(); };
    const key = (event: Event) => { if ((event as KeyboardEvent).code === 'Escape') cancel(); };
    const hidden = () => { if (doc.hidden) cancel(); };
    const lock = () => { if (doc.pointerLockElement !== canvas) cancel(); };
    const menu = (event: Event) => event.preventDefault();
    canvas.addEventListener('mousedown', down);
    canvas.addEventListener('contextmenu', menu);
    global.addEventListener('mouseup', up);
    global.addEventListener('mousemove', move);
    global.addEventListener('keydown', key);
    global.addEventListener('blur', cancel);
    doc.addEventListener('visibilitychange', hidden);
    doc.addEventListener('pointerlockchange', lock);
    doc.addEventListener('pointerlockerror', cancel);
    let active = true;
    const detach = () => {
      if (!active) return;
      active = false;
      canvas.removeEventListener('mousedown', down);
      canvas.removeEventListener('contextmenu', menu);
      global.removeEventListener('mouseup', up);
      global.removeEventListener('mousemove', move);
      global.removeEventListener('keydown', key);
      global.removeEventListener('blur', cancel);
      doc.removeEventListener('visibilitychange', hidden);
      doc.removeEventListener('pointerlockchange', lock);
      doc.removeEventListener('pointerlockerror', cancel);
      this.clear();
      if (this.detachCurrent === detach) this.detachCurrent = undefined;
    };
    this.detachCurrent = detach;
    return detach;
  }
}
