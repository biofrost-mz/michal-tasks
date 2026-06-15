import { useState, useRef, useCallback } from "react";

const DEFAULT_THRESHOLD = 92;
const DEFAULT_MAX = 132;

/**
 * Swipe gesture hook using native DOM listeners (not React synthetic events).
 * Native registration with { passive: false } ensures e.preventDefault() works on
 * iOS Safari, which is needed to prevent the browser from claiming the gesture for
 * scrolling and sending pointercancel.
 *
 * Returns `bindRef` — a callback ref to attach to the swipeable element.
 */
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
  const elRef = useRef(null);

  // Always-current callbacks via a single ref — native handlers read from this
  // so they never become stale without needing to re-subscribe.
  const cbRef = useRef(null);
  cbRef.current = { onSwipeLeft, onSwipeRight, threshold, maxSwipe };

  // Create native handlers once (they read current values via cbRef/state-setter refs).
  const handlersRef = useRef(null);
  if (!handlersRef.current) {
    const resetState = () => {
      startXRef.current = null;
      startYRef.current = null;
      swipeAxisRef.current = null;
      pointerIdRef.current = null;
    };

    const onPointerDown = (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      if (e.target.closest?.("button, input, textarea, select, a")) return;
      startXRef.current = e.clientX;
      startYRef.current = e.clientY;
      pointerIdRef.current = e.pointerId;
      offsetXRef.current = 0;
      swipeAxisRef.current = null;
      setSwiping(false);
      hasSwipedRef.current = false;
    };

    const onPointerMove = (e) => {
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
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
      }

      if (swipeAxisRef.current !== "x") return;
      // Works because listener is registered with { passive: false }
      e.preventDefault();

      const { maxSwipe } = cbRef.current;
      const clamped = Math.max(-maxSwipe, Math.min(maxSwipe, diff));
      offsetXRef.current = clamped;
      setOffsetX(clamped);
      if (Math.abs(clamped) > 10) hasSwipedRef.current = true;
    };

    const onPointerEnd = (e) => {
      if (pointerIdRef.current == null || pointerIdRef.current !== e.pointerId) return;
      setSwiping(false);
      const finalX = offsetXRef.current;
      const { threshold, onSwipeRight, onSwipeLeft } = cbRef.current;

      if (swipeAxisRef.current === "x") {
        if (finalX >= threshold && onSwipeRight) {
          setOffsetX(0);
          offsetXRef.current = 0;
          resetState();
          onSwipeRight();
          return;
        }
        if (finalX <= -threshold && onSwipeLeft) {
          setOffsetX(0);
          offsetXRef.current = 0;
          resetState();
          onSwipeLeft();
          return;
        }
      }

      setOffsetX(0);
      offsetXRef.current = 0;
      resetState();
    };

    const onPointerCancel = () => {
      setSwiping(false);
      setOffsetX(0);
      offsetXRef.current = 0;
      startXRef.current = null;
      startYRef.current = null;
      swipeAxisRef.current = null;
      pointerIdRef.current = null;
    };

    handlersRef.current = { onPointerDown, onPointerMove, onPointerEnd, onPointerCancel };
  }

  // Callback ref — called by React when the element mounts, unmounts, or changes.
  // Attaches/detaches native listeners so pointermove runs with { passive: false }.
  const bindRef = useCallback((el) => {
    const prev = elRef.current;
    if (prev) {
      const h = handlersRef.current;
      prev.removeEventListener("pointerdown", h.onPointerDown);
      prev.removeEventListener("pointermove", h.onPointerMove);
      prev.removeEventListener("pointerup", h.onPointerEnd);
      prev.removeEventListener("pointercancel", h.onPointerCancel);
      prev.removeEventListener("lostpointercapture", h.onPointerEnd);
    }
    elRef.current = el;
    if (el) {
      const h = handlersRef.current;
      el.addEventListener("pointerdown", h.onPointerDown);
      el.addEventListener("pointermove", h.onPointerMove, { passive: false });
      el.addEventListener("pointerup", h.onPointerEnd);
      el.addEventListener("pointercancel", h.onPointerCancel);
      el.addEventListener("lostpointercapture", h.onPointerEnd);
    }
  }, []); // stable — reads only from refs

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
    bindRef,
    // Legacy handlers kept in case other consumers use them
    handlers: {
      onPointerDown: handlersRef.current.onPointerDown,
      onPointerMove: handlersRef.current.onPointerMove,
      onPointerUp: handlersRef.current.onPointerEnd,
      onPointerCancel: handlersRef.current.onPointerCancel,
      onLostPointerCapture: handlersRef.current.onPointerEnd,
    },
  };
}
