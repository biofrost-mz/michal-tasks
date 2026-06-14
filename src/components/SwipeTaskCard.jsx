import React, { useState, useRef, useEffect } from "react";
import Icon from "./Icon.jsx";
import SnoozeSheet from "./SnoozeSheet.jsx";
import TaskContextSheet from "./TaskContextSheet.jsx";
import { useSwipeGesture } from "../hooks/useSwipeGesture.js";
import { triggerConfettiBurst } from "../utils.js";

const SWIPE_HINT_KEY = "mt:swipe-hint-shown";
const LONG_PRESS_MS = 500;
const LONG_PRESS_MOVE_LIMIT = 8;

export default function SwipeTaskCard({
  task,
  onStatusChange,
  onClick,
  onMouseEnter,
  focused,
  hintTarget,
  children,
}) {
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [hintActive, setHintActive] = useState(false);
  const cardRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const longPressStartRef = useRef(null);

  const handleSwipeRight = () => {
    if (task.status === "done") return;
    navigator.vibrate?.([20, 30, 60]);
    triggerConfettiBurst({ target: cardRef.current });
    setExiting(true);
    setTimeout(() => {
      onStatusChange(task.id, "done");
    }, 260);
  };

  const handleSwipeLeft = () => {
    navigator.vibrate?.([15, 20]);
    setSnoozeOpen(true);
  };

  const {
    offsetX,
    swiping,
    pastRightThreshold,
    pastLeftThreshold,
    rightProgress,
    leftProgress,
    hasSwipedRef,
    handlers,
  } = useSwipeGesture({
    onSwipeRight: handleSwipeRight,
    onSwipeLeft: handleSwipeLeft,
  });

  const scaleR = 0.72 + rightProgress * 0.28 + (pastRightThreshold ? 0.04 : 0);
  const scaleL = 0.72 + leftProgress * 0.28 + (pastLeftThreshold ? 0.04 : 0);

  // One-time swipe hint nudge
  useEffect(() => {
    if (!hintTarget) return;
    if (sessionStorage.getItem(SWIPE_HINT_KEY)) return;
    const t = setTimeout(() => {
      setHintActive(true);
      const t2 = setTimeout(() => {
        setHintActive(false);
        sessionStorage.setItem(SWIPE_HINT_KEY, "1");
      }, 1200);
      return () => clearTimeout(t2);
    }, 900);
    return () => clearTimeout(t);
  }, [hintTarget]);

  const shellClass = [
    "swipe-shell",
    swiping ? "is-swiping" : "",
    pastRightThreshold ? "is-ready-right" : "",
    pastLeftThreshold ? "is-ready-left" : "",
    exiting ? "is-exiting" : "",
  ].filter(Boolean).join(" ");

  return (
    <>
      <div
        className={shellClass}
        style={{
          "--drag-x": `${offsetX}px`,
          "--swipe-progress-r": rightProgress,
          "--swipe-progress-l": leftProgress,
          "--swipe-scale-r": scaleR,
          "--swipe-scale-l": scaleL,
        }}
      >
        {/* Green background — right swipe = done */}
        <div className="swipe-bg-right" aria-hidden="true">
          <div className="swipe-action swipe-action-right">
            <div className="swipe-icon swipe-icon-right">
              <Icon name="check" size={16} color="#d1fae5" strokeWidth={2.5} />
            </div>
            <span>Hotovo</span>
          </div>
        </div>

        {/* Amber background — left swipe = snooze */}
        <div className="swipe-bg-left" aria-hidden="true">
          <div className="swipe-action swipe-action-left">
            <div className="swipe-icon swipe-icon-left">
              <Icon name="clock" size={16} color="#fde68a" strokeWidth={2} />
            </div>
            <span>Odložit</span>
          </div>
        </div>

        {/* Card */}
        <div
          ref={cardRef}
          className={`swipe-card ${hintActive ? "swipe-hint-nudge" : ""}`}
          {...handlers}
          onPointerDown={(e) => {
            handlers.onPointerDown(e);
            // Long-press detection
            longPressStartRef.current = { x: e.clientX, y: e.clientY };
            longPressTimerRef.current = setTimeout(() => {
              navigator.vibrate?.([15, 20]);
              setContextOpen(true);
              longPressStartRef.current = null;
            }, LONG_PRESS_MS);
          }}
          onPointerMove={(e) => {
            handlers.onPointerMove(e);
            // Cancel long-press if moved too far
            if (longPressStartRef.current) {
              const dx = Math.abs(e.clientX - longPressStartRef.current.x);
              const dy = Math.abs(e.clientY - longPressStartRef.current.y);
              if (dx > LONG_PRESS_MOVE_LIMIT || dy > LONG_PRESS_MOVE_LIMIT) {
                clearTimeout(longPressTimerRef.current);
                longPressStartRef.current = null;
              }
            }
          }}
          onPointerUp={(e) => {
            clearTimeout(longPressTimerRef.current);
            longPressStartRef.current = null;
            handlers.onPointerUp(e);
          }}
          onPointerCancel={(e) => {
            clearTimeout(longPressTimerRef.current);
            longPressStartRef.current = null;
            handlers.onPointerCancel(e);
          }}
          onClick={(e) => {
            if (hasSwipedRef.current) return;
            if (Math.abs(offsetX) > 5) return;
            onClick?.(e);
          }}
          onMouseEnter={onMouseEnter}
          style={focused ? { outline: "1px solid var(--accent)", outlineOffset: -1 } : undefined}
        >
          {children}
        </div>
      </div>

      {snoozeOpen && (
        <SnoozeSheet
          taskId={task.id}
          onClose={() => setSnoozeOpen(false)}
        />
      )}

      {contextOpen && (
        <TaskContextSheet
          task={task}
          onClose={() => setContextOpen(false)}
          onEdit={() => onClick?.()}
        />
      )}
    </>
  );
}
