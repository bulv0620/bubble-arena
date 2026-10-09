import type { PointerLockInput } from '../camera';
import type { AimInput } from './AimInput';

export type CrosshairMode = 'hidden' | 'normal' | 'aiming';
interface InputDocument extends EventTarget { hidden?: boolean; pointerLockElement?: EventTarget | null }

/** Low-frequency HUD eligibility, never a simulation or hit test. */
export class CrosshairInput {
  private mode: CrosshairMode = 'hidden';
  private subscribers = new Set<() => void>();
  private detachCurrent?: () => void;
  constructor(private readonly pointer: PointerLockInput, private readonly aim: AimInput, private readonly aimChangesMode = true) {}
  getSnapshot = () => this.mode;
  subscribe = (listener: () => void) => {
    this.subscribers.add(listener);
    return () => { this.subscribers.delete(listener); };
  };
  private publish(mode: CrosshairMode) {
    if (mode === this.mode) return;
    this.mode = mode;
    for (const listener of this.subscribers) listener();
  }
  attach(canvas: EventTarget, global: EventTarget, doc: InputDocument) {
    this.detachCurrent?.();
    let active = this.pointer.getSnapshot() === 'locked', attached = true;
    const update = () => {
      const lock = this.pointer.getSnapshot(), aiming = this.aimChangesMode && this.aim.getSnapshot();
      const eligible = lock === 'locked' || aiming || lock === 'error' || lock === 'unsupported';
      this.publish(active && !doc.hidden && eligible ? aiming ? 'aiming' : 'normal' : 'hidden');
    };
    const cancel = () => { active = false; update(); };
    const activate = (event: Event) => {
      const e = event as MouseEvent;
      if ((e.button !== 0 && e.button !== 2) || e.altKey || e.metaKey || e.ctrlKey || doc.hidden
        || (doc.pointerLockElement && doc.pointerLockElement !== canvas)) return;
      active = true; update();
    };
    const key = (event: Event) => { if ((event as KeyboardEvent).code === 'Escape') cancel(); };
    const visibility = () => { if (doc.hidden) cancel(); };
    const unPointer = this.pointer.subscribe(() => {
      const lock = this.pointer.getSnapshot();
      if (lock === 'locked') active = true;
      if (lock === 'idle') active = false;
      update();
    });
    const unAim = this.aim.subscribe(() => {
      // AimInput admits only a fresh right press in the owned canvas.
      if (this.aimChangesMode && this.aim.getSnapshot()) active = true;
      update();
    });
    canvas.addEventListener('mousedown', activate);
    global.addEventListener('keydown', key);
    global.addEventListener('blur', cancel);
    doc.addEventListener('visibilitychange', visibility);
    update();
    const detach = () => {
      if (!attached) return;
      attached = false;
      unPointer(); unAim();
      canvas.removeEventListener('mousedown', activate);
      global.removeEventListener('keydown', key);
      global.removeEventListener('blur', cancel);
      doc.removeEventListener('visibilitychange', visibility);
      this.publish('hidden');
      if (this.detachCurrent === detach) this.detachCurrent = undefined;
    };
    this.detachCurrent = detach;
    return detach;
  }
}
