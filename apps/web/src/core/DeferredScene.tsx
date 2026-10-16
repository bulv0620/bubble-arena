import { useEffect, useState, type ReactNode } from 'react';

/** Let the Canvas connect its event/HTML host before Drei creates independent DOM roots. */
export function DeferredScene({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) setMounted(true); });
    return () => { active = false; };
  }, []);
  return mounted ? children : null;
}
