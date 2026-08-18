"use client";

import { useEffect, useRef, useState } from "react";
import { money } from "@/lib/format";

/**
 * Counts a figure up when it first scrolls into view.
 *
 * State starts at the real value, so the figure is correct in the server-
 * rendered HTML, correct with JavaScript disabled, correct for a crawler, and
 * never flashes a wrong number. The count-up only ever begins from inside the
 * IntersectionObserver callback, which also means there is no synchronous
 * state update during an effect and so no cascading render.
 *
 * Nothing animates under `prefers-reduced-motion`: counting digits is exactly
 * the kind of motion that provokes vestibular symptoms, and the observer is
 * never even attached in that case.
 */
export function AnimatedNumber({
  value,
  prefix,
  durationMs = 1400,
  className = "",
}: {
  value: number;
  prefix?: string;
  durationMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const frame = useRef(0);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min((now - start) / durationMs, 1);
          // Ease-out: quick enough to feel responsive, settling onto the
          // figure rather than snapping to it.
          setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
          if (t < 1) frame.current = requestAnimationFrame(tick);
        };
        frame.current = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame.current);
    };
  }, [value, durationMs]);

  return (
    <span ref={ref} className={`numeral ${className}`}>
      {prefix}
      {money(shown)}
    </span>
  );
}
