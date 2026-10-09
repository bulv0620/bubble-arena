export const DAMAGE_NUMBER_CONFIG = Object.freeze({ capacity: 12, durationMs: 1150, spreadX: 46, spreadY: 22, rise: 52 });
export interface DamageNumber { readonly id: number; readonly damage: number; readonly x: number; readonly y: number }
/** Presentation queue fed by accepted hits. No clock, timers, damage rules or physics ownership. */
export class DamageNumbers {
  private lastId = 0;
  private snapshot: readonly DamageNumber[] = Object.freeze([]);
  private listeners = new Set<() => void>();
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private notify() { for (const listener of this.listeners) listener(); }
  push(id: number, damage: number, rx = Math.random(), ry = Math.random()) {
    if (!Number.isSafeInteger(id) || id <= this.lastId || !Number.isFinite(damage) || damage <= 0
      || ![rx, ry].every(v => Number.isFinite(v) && v >= 0 && v < 1)) return false;
    this.lastId = id;
    const entry = Object.freeze({ id, damage, x: (rx * 2 - 1) * DAMAGE_NUMBER_CONFIG.spreadX,
      y: (ry * 2 - 1) * DAMAGE_NUMBER_CONFIG.spreadY });
    this.snapshot = Object.freeze([...this.snapshot.slice(-(DAMAGE_NUMBER_CONFIG.capacity - 1)), entry]);
    this.notify(); return true;
  }
  remove = (id: number) => {
    if (!this.snapshot.some(entry => entry.id === id)) return;
    this.snapshot = Object.freeze(this.snapshot.filter(entry => entry.id !== id)); this.notify();
  };
  clear = () => { if (this.snapshot.length) { this.snapshot = Object.freeze([]); this.notify(); } };
}
