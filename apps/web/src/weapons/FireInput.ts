import type { FireIntent } from '@bubble-arena/shared';
import type { PointerLockInput } from '../camera';
import type { AimInput } from '../input';

interface FireDocument extends EventTarget { hidden?: boolean; pointerLockElement: EventTarget | null }
const RELEASED: FireIntent = Object.freeze({ held: false, pressed: false });

/** Local intent collector. Never advances cooldowns, ammo or damage. */
export class FireInput {
  private snapshot = RELEASED;
  private subscribers = new Set<() => void>();
  private detachCurrent?: () => void;
  constructor(private readonly pointer: PointerLockInput, private readonly aim: AimInput) {}
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.subscribers.add(listener);
    return () => { this.subscribers.delete(listener); };
  };
  private publish(held: boolean, pressed: boolean) {
    if (held === this.snapshot.held && pressed === this.snapshot.pressed) return;
    this.snapshot = held || pressed ? Object.freeze({ held, pressed }) : RELEASED;
    for (const listener of this.subscribers) listener();
  }
  clear = () => this.publish(false, false);
  consume = (): FireIntent => {
    const result = this.snapshot;
    this.publish(result.held, false);
    return result;
  };
  attach(canvas: EventTarget, global: EventTarget, doc: FireDocument, enabled = () => true) {
    this.detachCurrent?.();
    const eligible = () => {
      if (!enabled() || doc.hidden || (doc.pointerLockElement && doc.pointerLockElement !== canvas)) return false;
      const lock = this.pointer.getSnapshot();
      return lock === 'locked' && doc.pointerLockElement === canvas
        || (lock === 'error' || lock === 'unsupported') && this.aim.getSnapshot();
    };
    const down = (event: Event) => {
      const e = event as MouseEvent;
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.altKey || !eligible() || this.snapshot.held) return;
      e.preventDefault();
      this.publish(true, true);
    };
    const up = (event: Event) => { if ((event as MouseEvent).button === 0) this.publish(false, this.snapshot.pressed); };
    const move = (event: Event) => {
      if (!eligible()) this.clear();
      else if (!((event as MouseEvent).buttons & 1)) this.publish(false, this.snapshot.pressed);
    };
    const key = (event: Event) => { if ((event as KeyboardEvent).code === 'Escape') this.clear(); };
    const hidden = () => { if (doc.hidden) this.clear(); };
    const changed = () => { if (!eligible()) this.clear(); };
    const unPointer = this.pointer.subscribe(changed), unAim = this.aim.subscribe(changed);
    canvas.addEventListener('mousedown', down);
    global.addEventListener('mouseup', up);
    global.addEventListener('mousemove', move);
    global.addEventListener('keydown', key);
    global.addEventListener('blur', this.clear);
    doc.addEventListener('visibilitychange', hidden);
    doc.addEventListener('pointerlockchange', changed);
    let active = true;
    const detach = () => {
      if (!active) return;
      active = false;
      unPointer(); unAim();
      canvas.removeEventListener('mousedown', down);
      global.removeEventListener('mouseup', up);
      global.removeEventListener('mousemove', move);
      global.removeEventListener('keydown', key);
      global.removeEventListener('blur', this.clear);
      doc.removeEventListener('visibilitychange', hidden);
      doc.removeEventListener('pointerlockchange', changed);
      this.clear();
      if (this.detachCurrent === detach) this.detachCurrent = undefined;
    };
    this.detachCurrent = detach;
    return detach;
  }
}
