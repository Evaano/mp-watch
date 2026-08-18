"use client";

import { useEffect, useState } from "react";

/**
 * Appears once the reader is far enough down that scrolling back is a chore.
 * Uses a sentinel and IntersectionObserver rather than a scroll listener, so
 * nothing runs on the main thread per frame.
 */
export function BackToTop({ label }: { label: string }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const sentinel = document.createElement("div");
    sentinel.style.cssText = "position:absolute;top:80vh;height:1px;width:1px;";
    document.body.appendChild(sentinel);

    const observer = new IntersectionObserver(
      ([entry]) => setShown(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 },
    );
    observer.observe(sentinel);

    return () => {
      observer.disconnect();
      sentinel.remove();
    };
  }, []);

  return (
    <button
      type="button"
      onClick={() =>
        window.scrollTo({
          top: 0,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
        })
      }
      aria-hidden={!shown}
      tabIndex={shown ? 0 : -1}
      className={`fixed bottom-4 end-4 z-20 rounded-card border border-line-strong bg-surface-raised px-3 py-2 text-sm shadow-sm transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        shown ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      {label}
    </button>
  );
}
