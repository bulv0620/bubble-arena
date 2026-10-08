import type { MovementKeys } from '@bubble-arena/shared';
export type { MovementKeys } from '@bubble-arena/shared';

const RELEASED: MovementKeys = Object.freeze({ forward: false, backward: false, left: false, right: false });
const BINDINGS: Readonly<Record<string, keyof MovementKeys>> = {
  KeyW: 'forward', KeyS: 'backward', KeyA: 'left', KeyD: 'right',
};

function getAction(code: string): keyof MovementKeys | undefined {
  return Object.hasOwn(BINDINGS, code) ? BINDINGS[code] : undefined;
}

function isEditable(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  return Boolean(element?.isContentEditable || element?.closest?.(
    'input, textarea, select, [contenteditable]:not([contenteditable="false"])',
  ));
}

/** Local intent only. No physics, coordinates or React dependency. */
export class KeyboardInput {
  private snapshot = RELEASED;
  private readonly subscribers = new Set<() => void>();
  private detach: (() => void) | undefined;
  private jumpHeld = false;
  private jumpQueued = false;

  getSnapshot = (): MovementKeys => this.snapshot;

  subscribe = (subscriber: () => void) => {
    this.subscribers.add(subscriber);
    return () => { this.subscribers.delete(subscriber); };
  };

  private publish(next: MovementKeys) {
    if (Object.keys(BINDINGS).every((code) => this.snapshot[BINDINGS[code]] === next[BINDINGS[code]])) return;
    this.snapshot = Object.freeze(next);
    for (const subscriber of this.subscribers) subscriber();
  }

  consumeJump = () => {
    const queued = this.jumpQueued;
    this.jumpQueued = false;
    return queued;
  };

  clear = () => {
    this.jumpHeld = false;
    this.jumpQueued = false;
    this.publish(RELEASED);
  };

  attach(keyTarget: EventTarget, visibilityTarget: EventTarget & Pick<Document, 'visibilityState'>) {
    this.detach?.();
    this.clear();
    const onKeyDown = (event: Event) => {
      const key = event as KeyboardEvent;
      const action = getAction(key.code);
      if ((!action && key.code !== 'Space') || key.isComposing || key.ctrlKey || key.metaKey || key.altKey || isEditable(key.target)
        || visibilityTarget.visibilityState === 'hidden') return;
      key.preventDefault();
      if (key.code === 'Space') {
        if (!key.repeat && !this.jumpHeld) this.jumpQueued = true;
        this.jumpHeld = true;
        return;
      }
      if (!action) return;
      this.publish({ ...this.snapshot, [action]: true });
    };
    const onKeyUp = (event: Event) => {
      const code = (event as KeyboardEvent).code;
      if (code === 'Space') this.jumpHeld = false;
      const action = getAction(code);
      // Always release, even if focus or modifiers changed since keydown.
      if (action) this.publish({ ...this.snapshot, [action]: false });
    };
    const onVisibility = () => {
      if (visibilityTarget.visibilityState === 'hidden') this.clear();
    };
    const onFocusIn = (event: Event) => { if (isEditable(event.target)) this.clear(); };
    keyTarget.addEventListener('keydown', onKeyDown);
    keyTarget.addEventListener('keyup', onKeyUp);
    keyTarget.addEventListener('blur', this.clear);
    visibilityTarget.addEventListener('visibilitychange', onVisibility);
    visibilityTarget.addEventListener('focusin', onFocusIn);
    let attached = true;
    const detach = () => {
      if (!attached) return;
      attached = false;
      keyTarget.removeEventListener('keydown', onKeyDown);
      keyTarget.removeEventListener('keyup', onKeyUp);
      keyTarget.removeEventListener('blur', this.clear);
      visibilityTarget.removeEventListener('visibilitychange', onVisibility);
      visibilityTarget.removeEventListener('focusin', onFocusIn);
      if (this.detach === detach) {
        this.detach = undefined;
        this.clear();
      }
    };
    this.detach = detach;
    return detach;
  }
}
