import { CAMERA_CONFIG } from '@bubble-arena/shared';
import { validMouseSpeed } from '../settings/mouseSettings';

export interface OrbitAngles { yaw: number; pitch: number }
const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

/** Direct presentation angles: the next render frame consumes all received mouse delta. */
export class MouseOrbit {
  private angles: OrbitAngles = { yaw: 0, pitch: CAMERA_CONFIG.initialPitch };
  private detachCurrent?: () => void;

  rotate(dx: number, dy: number, sensitivityMultiplier = 1) {
    if (![dx, dy, sensitivityMultiplier].every(Number.isFinite) || !validMouseSpeed(sensitivityMultiplier)) return;
    this.angles.yaw = wrap(this.angles.yaw - dx * CAMERA_CONFIG.mouseSensitivity * sensitivityMultiplier);
    this.angles.pitch = Math.max(CAMERA_CONFIG.minPitch, Math.min(CAMERA_CONFIG.maxPitch,
      this.angles.pitch + dy * CAMERA_CONFIG.mouseSensitivity * sensitivityMultiplier));
  }

  step(): OrbitAngles {
    return { ...this.angles };
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
