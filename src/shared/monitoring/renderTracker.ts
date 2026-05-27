/**
 * renderTracker.ts
 *
 * Custom profiling hook that tracks and tallies component render cycles.
 * Useful for debugging store subscriptions and eliminating render overhead.
 */
import { useRef, useEffect } from "react";

export function useRenderCount(componentName: string): number {
  const renderCountRef = useRef<number>(0);
  
  renderCountRef.current++;

  useEffect(() => {
    // Log in development configurations only
    if (__DEV__) {
      console.log(`⚙️ [RenderTracker] "${componentName}" render cycle count: ${renderCountRef.current}`);
    }
  });

  return renderCountRef.current;
}

// Global mock indicator to simulate react __DEV__ flag if undefined
const __DEV__ = typeof process !== "undefined" && process.env?.NODE_ENV !== "production";
