import { useEffect, useRef, useSyncExternalStore } from 'react';
import { InversionConfig, InversionEngine } from './inversion';

/** One engine per screen. Starts listening to the tilt sensor on mount. */
export function useInversion(config: Partial<InversionConfig> = {}) {
  const ref = useRef<InversionEngine | null>(null);
  if (!ref.current) ref.current = new InversionEngine(config);
  const engine = ref.current;
  const state = useSyncExternalStore(engine.subscribe, engine.getState, engine.getState);
  useEffect(() => {
    engine.start();
    return () => engine.stop();
  }, [engine]);
  return { engine, state };
}

/** Calls `fn(dt)` every animation frame while `active`. dt is in seconds, capped at 1/30. */
export function useFrame(fn: (dt: number) => void, active: boolean) {
  const cb = useRef(fn);
  cb.current = fn;
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = 0;
    const step = (t: number) => {
      const dt = last ? Math.min(1 / 30, (t - last) / 1000) : 1 / 60;
      last = t;
      cb.current(dt);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [active]);
}
