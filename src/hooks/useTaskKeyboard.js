import { useEffect, useCallback } from "react";

/**
 * Keyboard navigation for task lists.
 * J/K — move focus up/down, D — toggle done, S — toggle star, Enter — open detail.
 * Disabled when focus is on an input/textarea/select.
 */
export function useTaskKeyboard({ tasks, focusedId, setFocusedId, onOpen, onStatusChange, onStar }) {
  const getFocusedIndex = useCallback(() => {
    if (!focusedId) return -1;
    return tasks.findIndex((t) => t.id === focusedId);
  }, [tasks, focusedId]);

  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case "j":
        case "ArrowDown": {
          e.preventDefault();
          const idx = getFocusedIndex();
          const next = Math.min(idx + 1, tasks.length - 1);
          if (tasks[next]) setFocusedId(tasks[next].id);
          break;
        }
        case "k":
        case "ArrowUp": {
          e.preventDefault();
          const idx = getFocusedIndex();
          const prev = Math.max(idx - 1, 0);
          if (tasks[prev]) setFocusedId(tasks[prev].id);
          break;
        }
        case "Enter": {
          if (focusedId) { e.preventDefault(); onOpen(focusedId); }
          break;
        }
        case "d":
        case "D": {
          if (!focusedId) break;
          const task = tasks.find((t) => t.id === focusedId);
          if (task) { e.preventDefault(); onStatusChange(focusedId, task.status === "done" ? "todo" : "done"); }
          break;
        }
        case "s":
        case "S": {
          if (!focusedId) break;
          e.preventDefault();
          onStar(focusedId);
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [tasks, focusedId, getFocusedIndex, setFocusedId, onOpen, onStatusChange, onStar]);
}
