interface AimDocument extends EventTarget {
  hidden?: boolean;
  pointerLockElement: EventTarget | null;
}

/** Held intent only; no weapon, movement or authoritative simulation. */
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

  attach(canvas: EventTarget, global: EventTarget, doc: AimDocument) {
    this.detachCurrent?.();
    const down = (event: Event) => {
      const e = event as MouseEvent;
      if (e.button !== 2 || e.ctrlKey || e.metaKey || e.altKey || doc.hidden
        || (doc.pointerLockElement && doc.pointerLockElement !== canvas)) return;
      e.preventDefault();
      this.set(true);
    };
    const up = (event: Event) => { if ((event as MouseEvent).button === 2) this.clear(); };
    const move = (event: Event) => { if (!((event as MouseEvent).buttons & 2)) this.clear(); };
    const key = (event: Event) => { if ((event as KeyboardEvent).code === 'Escape') this.clear(); };
    const hidden = () => { if (doc.hidden) this.clear(); };
    const lock = () => { if (doc.pointerLockElement !== canvas) this.clear(); };
    const menu = (event: Event) => event.preventDefault();
    canvas.addEventListener('mousedown', down);
    canvas.addEventListener('contextmenu', menu);
    global.addEventListener('mouseup', up);
    global.addEventListener('mousemove', move);
    global.addEventListener('keydown', key);
    global.addEventListener('blur', this.clear);
    doc.addEventListener('visibilitychange', hidden);
    doc.addEventListener('pointerlockchange', lock);
    doc.addEventListener('pointerlockerror', this.clear);
    let active = true;
    const detach = () => {
      if (!active) return;
      active = false;
      canvas.removeEventListener('mousedown', down);
      canvas.removeEventListener('contextmenu', menu);
      global.removeEventListener('mouseup', up);
      global.removeEventListener('mousemove', move);
      global.removeEventListener('keydown', key);
      global.removeEventListener('blur', this.clear);
      doc.removeEventListener('visibilitychange', hidden);
      doc.removeEventListener('pointerlockchange', lock);
      doc.removeEventListener('pointerlockerror', this.clear);
      this.clear();
      if (this.detachCurrent === detach) this.detachCurrent = undefined;
    };
    this.detachCurrent = detach;
    return detach;
  }
}
