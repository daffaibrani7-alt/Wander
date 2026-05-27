/**
 * fpsMonitor.ts
 *
 * Measures device drawing frame rates (FPS) using requestAnimationFrame.
 * Drives diagnostic measurements on the performance HUD.
 */
import { useEffect, useState, useRef } from "react";

export function useFps(): number {
  const [fps, setFps] = useState<number>(60);
  const frameCountRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const animationIdRef = useRef<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const now = performance.now();
      frameCountRef.current++;

      if (now >= lastTimeRef.current + 1000) {
        const computedFps = Math.round((frameCountRef.current * 1000) / (now - lastTimeRef.current));
        setFps(Math.min(60, computedFps));
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      animationIdRef.current = requestAnimationFrame(tick);
    };

    animationIdRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationIdRef.current !== null) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, []);

  return fps;
}
