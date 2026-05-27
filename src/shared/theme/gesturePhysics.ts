/**
 * gesturePhysics.ts
 *
 * Defines gesture resistance coefficients, sheet damping behaviors,
 * and Apple-quality drag friction dynamics.
 */

export const GESTURE_PHYSICS = {
  // Swipe resistance ratio (lower values = stiffer drag boundary pushes)
  dragFrictionRatio: 0.38,

  // Velocity threshold to trigger sheet dismissal or snaps (meters per second)
  velocitySnapThreshold: 1.5,

  // Drag distance percentage required to trigger modal closure
  closeDistanceFraction: 0.45,

  // Rubber-banding resistance curve function for borders
  calculateResistance: (currentDrag: number, boundaryLimit: number): number => {
    "worklet";
    const drag = Math.abs(currentDrag);
    const limit = Math.abs(boundaryLimit);
    if (drag <= 0) return 0;
    
    // Smooth logarithmic rubberband curve
    const direction = currentDrag < 0 ? -1 : 1;
    const factor = Math.log10(1 + drag / (limit || 100));
    return direction * limit * factor * 0.85;
  },
};
