import { useState, useEffect, useRef } from "react";

export function useCountUp(target, duration = 600, enabled = true) {
  const [value, setValue] = useState(enabled ? 0 : target);
  const started = useRef(false);

  useEffect(() => {
    if (!enabled || started.current) return;
    started.current = true;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }

    const startTime = performance.now();

    function frame(now) {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setValue(Math.round(target * eased));
      if (t < 1) requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return value;
}
