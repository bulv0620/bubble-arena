import { useEffect, useState, type ReactNode } from 'react';
import { fitHudScale } from '../settings/hudSettings';
import './hudScale.css';

export function useHudScale(preference: number, canvas: HTMLCanvasElement | null) {
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!canvas) return;
    const measure = () => setViewport({ width: canvas.clientWidth, height: canvas.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [canvas]);
  return fitHudScale(preference, viewport.width, viewport.height);
}

export function HudScaleLayer({ scale, children }: { scale: number; children: ReactNode }) {
  return <div className="hud-scale-layer" style={{ width: `${100 / scale}%`, height: `${100 / scale}%`, transform: `scale(${scale})` }}>{children}</div>;
}
