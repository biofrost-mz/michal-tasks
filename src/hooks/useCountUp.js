import { useState, useEffect, useRef } from "react";

export function useCountUp(target, duration = 600, enabled = true) {
  const [value, setValue] = useState(enabled ? 0 : target);
  const started = useRef(false);
  const rafId = useRef(null);

  useEffect(() => {
    if (!enabled || started.current) return;
    started.current = true;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }

    const startTime = performance.now();
    let alive = true;

    function frame(now) {
      if (!alive) return;
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setValue(Math.round(target * eased));
      if (t < 1) rafId.current = requestAnimationFrame(frame);
    }

    rafId.current = requestAnimationFrame(frame);

    return () => {
      alive = false;
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return value;
}
