import { CAMERA_CONFIG } from '@bubble-arena/shared';

export interface OrbitAngles { yaw: number; pitch: number }
const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

/** Presentation-only angles; never changes player movement or physics. */
export class MouseOrbit {
  private desired: OrbitAngles = { yaw: 0, pitch: CAMERA_CONFIG.initialPitch };
  private shown: OrbitAngles = { ...this.desired };
  private detachCurrent?: () => void;

  rotate(dx: number, dy: number) {
    if (![dx, dy].every(Number.isFinite)) return;
    this.desired.yaw = wrap(this.desired.yaw - dx * CAMERA_CONFIG.mouseSensitivity);
    this.desired.pitch = Math.max(-CAMERA_CONFIG.poleGuard, Math.min(CAMERA_CONFIG.poleGuard,
      this.desired.pitch + dy * CAMERA_CONFIG.mouseSensitivity));
  }

  step(dt: number): OrbitAngles {
    if (Number.isFinite(dt) && dt > 0) {
      const blend = 1 - Math.exp(-CAMERA_CONFIG.rotationResponse * dt);
      this.shown.yaw = wrap(this.shown.yaw + wrap(this.desired.yaw - this.shown.yaw) * blend);
      this.shown.pitch += (this.desired.pitch - this.shown.pitch) * blend;
    }
    return { ...this.shown };
  }

  attach(canvas: EventTarget, global: EventTarget, visibility: EventTarget & { hidden?: boolean }) {
    this.detachCurrent?.();
    let last: { x: number; y: number } | null = null;
    const clear = () => { last = null; };
    const down = (event: Event) => {
      const e = event as MouseEvent;
      if (e.button !== 0 || e.altKey || e.ctrlKey || e.metaKey || visibility.hidden) return;
      last = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    };
    const move = (event: Event) => {
      const e = event as MouseEvent;
      if (!last) return;
      if (!(e.buttons & 1) || visibility.hidden) return clear();
      this.rotate(e.clientX - last.x, e.clientY - last.y);
      last = { x: e.clientX, y: e.clientY };
    };
    const onVisibility = () => { if (visibility.hidden) clear(); };
    canvas.addEventListener('mousedown', down);
    global.addEventListener('mousemove', move);
    global.addEventListener('mouseup', clear);
    global.addEventListener('blur', clear);
    visibility.addEventListener('visibilitychange', onVisibility);
    let detached = false;
    const detach = () => {
      if (detached) return;
      detached = true;
      clear();
      canvas.removeEventListener('mousedown', down);
      global.removeEventListener('mousemove', move);
      global.removeEventListener('mouseup', clear);
      global.removeEventListener('blur', clear);
      visibility.removeEventListener('visibilitychange', onVisibility);
      if (this.detachCurrent === detach) this.detachCurrent = undefined;
    };
    this.detachCurrent = detach;
    return detach;
  }
}
