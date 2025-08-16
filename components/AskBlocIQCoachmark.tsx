"use client";
import { useEffect, useRef, useState } from "react";

export default function AskBlocIQCoachmark({
  anchorSelector = "#ask-blociq-fab",
  storageKey = "ask-blociq-coachmark-dismissed",
  offsetX = 92,
  offsetY = 92,
  forceShow = false,
}) {
  const [visible, setVisible] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const coachRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (forceShow) return setVisible(true);
    const raw = localStorage.getItem(storageKey);
    if (!raw) return setVisible(true);
    try {
      const { dismissedAt } = JSON.parse(raw);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedAt > sevenDays) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, [forceShow, storageKey]);

  useEffect(() => {
    if (!visible) return;
    const place = () => {
      const anchor = document.querySelector(anchorSelector) as HTMLElement | null;
      if (anchor) {
        const rect = anchor.getBoundingClientRect();
        const gap = 12;
        const left = Math.max(12, rect.left - 280);
        const top = Math.max(12, rect.top - 120 - gap);
        setStyle({ position: "fixed", left, top });
      } else {
        setStyle({ position: "fixed", right: offsetX, bottom: offsetY + 56 });
      }
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, { passive: true });
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place);
    };
  }, [visible, anchorSelector, offsetX, offsetY]);

  const dismiss = () => {
    localStorage.setItem(storageKey, JSON.stringify({ dismissedAt: Date.now() }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      ref={coachRef}
      role="dialog"
      aria-labelledby="askbq-coachmark-title"
      aria-describedby="askbq-coachmark-desc"
      className="z-[60] max-w-xs rounded-2xl shadow-xl border border-white/20 bg-white/95 backdrop-blur p-4
                 dark:bg-neutral-900/95 dark:border-neutral-700
                 animate-wiggle"
      style={style}
    >
      {/* Pointer/arrow */}
      <div
        aria-hidden
        className="absolute animate-bounce-slow"
        style={{
          right: 16,
          bottom: -8,
          width: 0,
          height: 0,
          borderLeft: "8px solid transparent",
          borderRight: "8px solid transparent",
          borderTop: "8px solid rgba(255,255,255,0.95)",
        }}
      />
      {/* Dark mode arrow */}
      <div
        aria-hidden
        className="absolute animate-bounce-slow dark:block hidden"
        style={{
          right: 16,
          bottom: -8,
          width: 0,
          height: 0,
          borderLeft: "8px solid transparent",
          borderRight: "8px solid transparent",
          borderTop: "8px solid rgba(23,23,23,0.95)",
        }}
      />

      <h2 id="askbq-coachmark-title" className="text-sm font-semibold">
        Use BlocIQ Today
      </h2>
      <p id="askbq-coachmark-desc" className="mt-1 text-sm leading-snug text-neutral-700 dark:text-neutral-200">
        Click the Brain in the bottom-right to start your free trial of Ask BlocIQ.
      </p>

      <div className="mt-3 flex gap-2">
        <button
          onClick={dismiss}
          className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-medium
                     bg-primary text-white hover:opacity-90 transition"
        >
          Got it
        </button>
        <button
          onClick={dismiss}
          className="px-3 py-2 rounded-xl text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          aria-label="Dismiss"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
