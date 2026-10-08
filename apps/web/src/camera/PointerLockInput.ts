export type PointerLockStatus = 'idle' | 'requesting' | 'locked' | 'error' | 'unsupported';
interface LockCanvas extends EventTarget { requestPointerLock?: () => void | Promise<void> }
interface LockDocument extends EventTarget {
  hidden?: boolean;
  pointerLockElement: EventTarget | null;
  exitPointerLock?: () => void;
}

/** Owns only canvas pointer lock and relative mouse intent. No coordinates or simulation. */
export class PointerLockInput {
  private status: PointerLockStatus = 'idle';
  private subscribers = new Set<() => void>();
  private detachCurrent?: () => void;
  private currentCanvas: EventTarget | null = null;
  getSnapshot = () => this.status;
  subscribe = (listener: () => void) => {
    this.subscribers.add(listener);
    return () => { this.subscribers.delete(listener); };
  };
  private publish(status: PointerLockStatus) {
    if (this.status === status) return;
    this.status = status;
    for (const listener of this.subscribers) listener();
  }

  attach(canvas: LockCanvas, global: EventTarget, doc: LockDocument,
    rotate: (dx: number, dy: number) => void, clearInput: () => void) {
    this.detachCurrent?.();
    this.currentCanvas = canvas;
    let active = true, wanted = false, pending = false;
    const removeSettlement = () => {
      doc.removeEventListener('pointerlockchange', change);
      doc.removeEventListener('pointerlockerror', error);
    };
    const exitOwned = () => { if (doc.pointerLockElement === canvas) doc.exitPointerLock?.(); };
    const release = () => {
      wanted = false;
      clearInput();
      this.publish(canvas.requestPointerLock ? 'idle' : 'unsupported');
      exitOwned();
    };
    const change = () => {
      pending = false;
      if (!active) {
        // A late grant after unmount must not retain the cursor. A newer binding
        // requesting the same canvas may adopt the grant instead.
        const canAdopt = this.currentCanvas === canvas && (this.status === 'requesting' || this.status === 'locked');
        if (!canAdopt) exitOwned();
        removeSettlement();
        return;
      }
      if (doc.pointerLockElement === canvas && wanted && !doc.hidden) this.publish('locked');
      else release();
    };
    const error = () => {
      pending = false;
      if (!active) { removeSettlement(); return; }
      if (!wanted) return;
      wanted = false;
      clearInput();
      this.publish('error');
    };
    const click = (event: Event) => {
      const e = event as MouseEvent;
      if (e.button !== 0 || e.altKey || e.ctrlKey || e.metaKey || doc.hidden
        || pending || doc.pointerLockElement === canvas) return;
      if (!canvas.requestPointerLock) { this.publish('unsupported'); return; }
      if (doc.pointerLockElement) { this.publish('error'); return; }
      wanted = true; pending = true; this.publish('requesting');
      try {
        const promise = canvas.requestPointerLock();
        if (promise) void promise.catch(() => { if (pending) error(); });
      } catch { error(); }
    };
    const move = (event: Event) => {
      if (!active || !wanted || doc.hidden || this.status !== 'locked' || doc.pointerLockElement !== canvas) return;
      const e = event as MouseEvent;
      rotate(e.movementX, e.movementY);
    };
    const key = (event: Event) => { if ((event as KeyboardEvent).code === 'Escape') release(); };
    const visibility = () => { if (doc.hidden) release(); };
    canvas.addEventListener('click', click);
    doc.addEventListener('pointerlockchange', change);
    doc.addEventListener('pointerlockerror', error);
    global.addEventListener('mousemove', move);
    global.addEventListener('keydown', key);
    global.addEventListener('blur', release);
    doc.addEventListener('visibilitychange', visibility);
    this.publish(canvas.requestPointerLock ? 'idle' : 'unsupported');
    const detach = () => {
      if (!active) return;
      active = false;
      canvas.removeEventListener('click', click);
      global.removeEventListener('mousemove', move);
      global.removeEventListener('keydown', key);
      global.removeEventListener('blur', release);
      doc.removeEventListener('visibilitychange', visibility);
      release();
      // Keep only settlement listeners while an un-cancellable legacy request
      // is pending, to release a late grant; remove them when it settles.
      if (!pending) removeSettlement();
      if (this.detachCurrent === detach) {
        this.detachCurrent = undefined;
        this.currentCanvas = null;
      }
    };
    this.detachCurrent = detach;
    return detach;
  }
}
