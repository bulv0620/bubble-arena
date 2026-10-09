import { CAMERA_CONFIG } from '@bubble-arena/shared';
import { validMouseSpeed } from '../settings/mouseSettings';

export interface OrbitAngles { yaw: number; pitch: number }
const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

/** Presentation-only angles; never changes player movement or physics. */
export class MouseOrbit {
  private desired: OrbitAngles = { yaw: 0, pitch: CAMERA_CONFIG.initialPitch };
  private shown: OrbitAngles = { ...this.desired };
  private detachCurrent?: () => void;

  rotate(dx: number, dy: number, sensitivityMultiplier = 1) {
    if (![dx, dy, sensitivityMultiplier].every(Number.isFinite) || !validMouseSpeed(sensitivityMultiplier)) return;
    this.desired.yaw = wrap(this.desired.yaw - dx * CAMERA_CONFIG.mouseSensitivity * sensitivityMultiplier);
    this.desired.pitch = Math.max(CAMERA_CONFIG.minPitch, Math.min(CAMERA_CONFIG.maxPitch,
      this.desired.pitch + dy * CAMERA_CONFIG.mouseSensitivity * sensitivityMultiplier));
  }

  step(dt: number): OrbitAngles {
    if (Number.isFinite(dt) && dt > 0) {
      const blend = 1 - Math.exp(-CAMERA_CONFIG.rotationResponse * dt);
      this.shown.yaw = wrap(this.shown.yaw + wrap(this.desired.yaw - this.shown.yaw) * blend);
      this.shown.pitch += (this.desired.pitch - this.shown.pitch) * blend;
    }
    return { ...this.shown };
  }

  attach(canvas: EventTarget, global: EventTarget, visibility: EventTarget & { hidden?: boolean },
    enabled = () => true, sensitivity = () => 1) {
    this.detachCurrent?.();
    let last: { x: number; y: number } | null = null;
    const clear = () => { last = null; };
    const down = (event: Event) => {
      const e = event as MouseEvent;
      if (!enabled() || e.button !== 0 || e.altKey || e.ctrlKey || e.metaKey || visibility.hidden) return;
      last = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    };
    const move = (event: Event) => {
      const e = event as MouseEvent;
      if (!last) return;
      if (!enabled() || !(e.buttons & 1) || visibility.hidden) return clear();
      this.rotate(e.clientX - last.x, e.clientY - last.y, sensitivity());
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
