import { useFrame } from '@react-three/fiber';
import { useSyncExternalStore } from 'react';
/** Counts rendered frames, independent from the simulation clock. */
export class FrameStats {
  private fps: number | null = null;
  private elapsed = 0;
  private frames = 0;
  private readonly listeners = new Set<() => void>();
  getSnapshot = () => this.fps;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  frame(delta: number) {
    if (!Number.isFinite(delta) || delta <= 0 || delta > .5) { this.elapsed = 0; this.frames = 0; return; }
    this.elapsed += delta; this.frames++;
    if (this.elapsed < .5) return;
    const fps = Math.round(this.frames / this.elapsed); this.elapsed = 0; this.frames = 0;
    if (fps !== this.fps) { this.fps = fps; for (const listener of this.listeners) listener(); }
  }
}
export function FrameSampler({ stats }: { stats: FrameStats }) { useFrame((_, delta) => stats.frame(delta)); return null; }
export function PerformanceHint({ stats }: { stats: FrameStats }) {
  const fps = useSyncExternalStore(stats.subscribe, stats.getSnapshot);
  return <output className="combat-performance" aria-label="性能状态" aria-live="off">{fps ?? '—'} FPS <span>·</span> 0 ms</output>;
}
