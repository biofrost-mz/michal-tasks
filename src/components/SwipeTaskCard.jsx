import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon.jsx";
import SnoozeSheet from "./SnoozeSheet.jsx";
import TaskContextSheet from "./TaskContextSheet.jsx";
import { useSwipeGesture } from "../hooks/useSwipeGesture.js";
import { useApp } from "../context/AppContext.jsx";
import { useToast } from "./Toast.jsx";
import { formatDateKey } from "../locale.js";
import { startOfToday, triggerConfettiBurst } from "../utils.js";

const SWIPE_HINT_KEY = "mt:swipe-hint-shown";
const SWIPE_USED_KEY = "mt:swipe-used";
const LONG_PRESS_MS = 500;
const LONG_PRESS_MOVE_LIMIT = 8;
const LONG_LEFT_SWIPE_THRESHOLD = 110;

export default function SwipeTaskCard({
  task,
  onStatusChange,
  onClick,
  onMouseEnter,
  focused,
  hintTarget,
  children,
}) {
  const { updateTask } = useApp();
  const toast = useToast();
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [hintActive, setHintActive] = useState(false);
  const cardRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const longPressStartRef = useRef(null);
  const longPressDidFireRef = useRef(false);
  const portalRoot = typeof document !== "undefined" ? document.body : null;

  const markSwipeUsed = () => {
    try { localStorage.setItem(SWIPE_USED_KEY, "1"); } catch {}
  };

  const showUndoToast = (message, onUndo) => {
    toast(
      <>
        <span>{message}</span>
        <button
          className="toast-action"
          onClick={(e) => {
            e.stopPropagation();
            onUndo?.();
          }}
        >
          Zpět
        </button>
      </>,
      "success"
    );
  };

  const snoozeToTomorrow = () => {
    const tomorrow = new Date(startOfToday().getTime() + 86400000);
    const nextDueDate = formatDateKey(tomorrow);
    const previousDueDate = task.dueDate ?? null;
    updateTask(task.id, { dueDate: nextDueDate }, { silent: true });
    showUndoToast("Odloženo na zítra", () => {
      updateTask(task.id, { dueDate: previousDueDate }, { silent: true });
    });
  };

  const handleSwipeRight = () => {
    if (task.status === "done") return;
    markSwipeUsed();
    navigator.vibrate?.([20, 30, 60]);
    triggerConfettiBurst({ target: cardRef.current });
    setExiting(true);
    setTimeout(() => {
      onStatusChange(task.id, "done", { silent: true });
      showUndoToast("Hotovo", () => {
        setExiting(false);
        onStatusChange(task.id, task.status || "todo", { silent: true });
      });
    }, 260);
  };

  const handleSwipeLeft = ({ distance } = {}) => {
    markSwipeUsed();
    navigator.vibrate?.([15, 20]);
    if (distance >= LONG_LEFT_SWIPE_THRESHOLD) {
      snoozeToTomorrow();
      return;
    }
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

  const clearLongPress = ({ resetDidFire = false } = {}) => {
    clearTimeout(longPressTimerRef.current);
    longPressStartRef.current = null;
    if (resetDidFire) longPressDidFireRef.current = false;
  };

  const suppressSyntheticClick = (e) => {
    if (!longPressDidFireRef.current && !hasSwipedRef.current) return false;
    e.preventDefault();
    e.stopPropagation();
    longPressDidFireRef.current = false;
    return true;
  };

  const scaleR = pastRightThreshold ? 1.04 : 0.7 + rightProgress * 0.22;
  const scaleL = pastLeftThreshold ? 1.04 : 0.7 + leftProgress * 0.22;

  // One-time swipe hint nudge
  useEffect(() => {
    if (!hintTarget) return;
    try {
      if (localStorage.getItem(SWIPE_USED_KEY)) return;
    } catch {}
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

        {/* .tcard IS the swipe card — handlers + class directly on the touch target,
            same structure as QuickTodosPage which works on iOS */}
        {React.cloneElement(children, {
          ref: cardRef,
          className: [
            children.props.className,
            "swipe-card",
            hintActive ? "swipe-hint-nudge" : "",
          ].filter(Boolean).join(" "),
          onPointerDown: (e) => {
            handlers.onPointerDown(e);
            if (e.target.closest?.("input, textarea, select, a, [contenteditable='true'], [data-swipe-ignore='true']")) return;
            longPressStartRef.current = { x: e.clientX, y: e.clientY };
            longPressTimerRef.current = setTimeout(() => {
              navigator.vibrate?.([15, 20]);
              longPressDidFireRef.current = true;
              setContextOpen(true);
              longPressStartRef.current = null;
            }, LONG_PRESS_MS);
          },
          onPointerMove: (e) => {
            handlers.onPointerMove(e);
            if (longPressStartRef.current) {
              const dx = Math.abs(e.clientX - longPressStartRef.current.x);
              const dy = Math.abs(e.clientY - longPressStartRef.current.y);
              if (dx > LONG_PRESS_MOVE_LIMIT || dy > LONG_PRESS_MOVE_LIMIT) {
                clearLongPress({ resetDidFire: true });
              }
            }
          },
          onPointerUp: (e) => {
            clearLongPress();
            handlers.onPointerUp(e);
          },
          onPointerCancel: (e) => {
            clearLongPress({ resetDidFire: true });
            handlers.onPointerCancel(e);
          },
          onLostPointerCapture: (e) => {
            clearLongPress();
            handlers.onLostPointerCapture(e);
          },
          onClickCapture: (e) => {
            if (suppressSyntheticClick(e)) return;
            children.props.onClickCapture?.(e);
          },
          onClick: (e) => {
            if (longPressDidFireRef.current) { longPressDidFireRef.current = false; return; }
            if (hasSwipedRef.current) return;
            if (Math.abs(offsetX) > 5) return;
            onClick?.(e);
          },
          onMouseEnter,
          style: focused
            ? { ...children.props.style, outline: "1px solid var(--accent)", outlineOffset: -1 }
            : children.props.style,
        })}
      </div>

      {snoozeOpen && portalRoot && createPortal(
        <SnoozeSheet
          taskId={task.id}
          task={task}
          onSnoozed={({ previousDueDate, label }) => {
            showUndoToast(`Odloženo: ${label}`, () => {
              updateTask(task.id, { dueDate: previousDueDate ?? null }, { silent: true });
            });
          }}
          onClose={() => setSnoozeOpen(false)}
        />,
        portalRoot
      )}

      {contextOpen && portalRoot && createPortal(
        <TaskContextSheet
          task={task}
          onClose={() => setContextOpen(false)}
          onEdit={() => onClick?.()}
        />,
        portalRoot
      )}
    </>
  );
}
