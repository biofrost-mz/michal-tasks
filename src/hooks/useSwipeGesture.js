import { useState, useRef, useCallback } from "react";

const DEFAULT_THRESHOLD = 92;
const DEFAULT_MAX = 132;

export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  threshold = DEFAULT_THRESHOLD,
  maxSwipe = DEFAULT_MAX,
} = {}) {
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);

  const startXRef = useRef(null);
  const startYRef = useRef(null);
  const swipeAxisRef = useRef(null); // null | "x" | "ignored"
  const hasSwipedRef = useRef(false);
  const offsetXRef = useRef(0);
  const pointerIdRef = useRef(null);

  const resetRefs = useCallback((e) => {
    startXRef.current = null;
    startYRef.current = null;
    swipeAxisRef.current = null;
    pointerIdRef.current = null;
    if (e) {
      try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch {}
    }
  }, []);

  const onPointerDown = useCallback((e) => {
    if (e.button !== undefined && e.button !== 0) return;
    if (e.target.closest?.("button, input, textarea, select, a")) return;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    pointerIdRef.current = e.pointerId;
    offsetXRef.current = 0;
    swipeAxisRef.current = null;
    setSwiping(false);
    hasSwipedRef.current = false;
  }, []);

  const onPointerMove = useCallback((e) => {
    if (pointerIdRef.current !== e.pointerId) return;
    if (startXRef.current == null) return;

    const diff = e.clientX - startXRef.current;
    const diffY = e.clientY - startYRef.current;
    const absX = Math.abs(diff);
    const absY = Math.abs(diffY);

    if (swipeAxisRef.current == null) {
      if (absX < 6 && absY < 6) return;
      if (absY > absX) {
        swipeAxisRef.current = "ignored";
        setSwiping(false);
        return;
      }
      swipeAxisRef.current = "x";
      setSwiping(true);
      hasSwipedRef.current = true;
      try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch {}
    }

    if (swipeAxisRef.current !== "x") return;
    e.preventDefault();

    const clamped = Math.max(-maxSwipe, Math.min(maxSwipe, diff));
    offsetXRef.current = clamped;
    setOffsetX(clamped);
    if (Math.abs(clamped) > 10) hasSwipedRef.current = true;
  }, [maxSwipe]);

  const onPointerEnd = useCallback((e) => {
    if (pointerIdRef.current == null || pointerIdRef.current !== e.pointerId) return;
    setSwiping(false);
    const finalX = offsetXRef.current;

    if (swipeAxisRef.current === "x") {
      if (finalX >= threshold && onSwipeRight) {
        resetRefs(e);
        onSwipeRight();
        return;
      } else if (finalX <= -threshold && onSwipeLeft) {
        resetRefs(e);
        onSwipeLeft();
        return;
      }
    }

    setOffsetX(0);
    offsetXRef.current = 0;
    resetRefs(e);
  }, [threshold, onSwipeLeft, onSwipeRight, resetRefs]);

  const onPointerCancel = useCallback((e) => {
    setSwiping(false);
    setOffsetX(0);
    offsetXRef.current = 0;
    resetRefs(e);
  }, [resetRefs]);

  const pastRightThreshold = offsetX >= threshold;
  const pastLeftThreshold = offsetX <= -threshold;
  const rightProgress = Math.min(offsetX / threshold, 1);
  const leftProgress = Math.min(-offsetX / threshold, 1);

  return {
    offsetX,
    swiping,
    pastRightThreshold,
    pastLeftThreshold,
    rightProgress,
    leftProgress,
    hasSwipedRef,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel,
      onLostPointerCapture: onPointerEnd,
    },
  };
}
