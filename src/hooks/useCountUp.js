import { useState, useEffect, useRef } from "react";

export function useCountUp(target, duration = 600, enabled = true) {
  const [value, setValue] = useState(enabled ? 0 : target);
  const rafId = useRef(null);
  // Ref so the animation frame closure always reads the latest displayed value
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (!enabled) { setValue(target); return; }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }

    const startValue = valueRef.current;
    const startTime = performance.now();
    let alive = true;

    function frame(now) {
      if (!alive) return;
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setValue(Math.round(startValue + (target - startValue) * eased));
      if (t < 1) rafId.current = requestAnimationFrame(frame);
    }

    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(frame);

    return () => {
      alive = false;
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [target, enabled]);

  return value;
}
