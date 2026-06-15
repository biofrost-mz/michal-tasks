import { useRef, useCallback } from "react";

const EDGE_THRESHOLD = 30;
const SWIPE_THRESHOLD = 80;

export function useEdgeSwipe({
  onSwipeLeft,
  onSwipeRight,
  edgeThreshold = EDGE_THRESHOLD,
  swipeThreshold = SWIPE_THRESHOLD,
} = {}) {
  const startXRef = useRef(null);
  const startYRef = useRef(null);
  const activeRef = useRef(false);
  const axisRef = useRef(null);
  const pointerIdRef = useRef(null);

  const reset = useCallback(() => {
    activeRef.current = false;
    startXRef.current = null;
    startYRef.current = null;
    axisRef.current = null;
    pointerIdRef.current = null;
  }, []);

  const onPointerDown = useCallback((e) => {
    if (e.pointerType === "mouse") return;
    const nearLeft = e.clientX <= edgeThreshold;
    const nearRight = e.clientX >= window.innerWidth - edgeThreshold;
    if (!nearLeft && !nearRight) return;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    activeRef.current = true;
    axisRef.current = null;
    pointerIdRef.current = e.pointerId;
  }, [edgeThreshold]);

  const onPointerMove = useCallback((e) => {
    if (!activeRef.current || pointerIdRef.current !== e.pointerId) return;
    if (startXRef.current == null) return;
    const dx = Math.abs(e.clientX - startXRef.current);
    const dy = Math.abs(e.clientY - startYRef.current);
    if (axisRef.current == null && (dx >= 6 || dy >= 6)) {
      axisRef.current = dx >= dy ? "x" : "y";
      if (axisRef.current === "x") {
        try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch {}
      }
    }
  }, []);

  const onPointerUp = useCallback((e) => {
    if (!activeRef.current || pointerIdRef.current !== e.pointerId) return;
    if (startXRef.current == null) { reset(); return; }
    if (axisRef.current === "x") {
      const dx = e.clientX - startXRef.current;
      if (dx <= -swipeThreshold && onSwipeLeft) onSwipeLeft();
      else if (dx >= swipeThreshold && onSwipeRight) onSwipeRight();
    }
    reset();
  }, [swipeThreshold, onSwipeLeft, onSwipeRight, reset]);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: reset,
    onLostPointerCapture: reset,
  };
}
