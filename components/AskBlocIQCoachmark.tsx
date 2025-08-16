"use client";
import { useEffect, useRef, useState } from "react";
import { Brain, Sparkles, ArrowRight, X } from "lucide-react";

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
        const left = Math.max(12, rect.left - 320); // Increased width
        const top = Math.max(12, rect.top - 140 - gap);
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
      className="z-[60] max-w-sm rounded-2xl shadow-2xl border-0 
                 bg-gradient-to-br from-white via-blue-50/50 to-teal-50/50
                 dark:from-slate-900 dark:via-slate-800/50 dark:to-slate-900/50
                 backdrop-blur-xl p-6 relative overflow-hidden
                 animate-wiggle"
      style={style}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-primary/10 to-transparent rounded-full -translate-y-10 translate-x-10" />
      <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-secondary/10 to-transparent rounded-full translate-y-8 -translate-x-8" />
      
      {/* Floating Sparkles */}
      <div className="absolute top-3 right-3">
        <Sparkles className="w-4 h-4 text-primary animate-pulse" />
      </div>
      
      {/* Close Button */}
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 p-1 rounded-full bg-white/80 dark:bg-slate-800/80 
                   hover:bg-white dark:hover:bg-slate-700 transition-all duration-200
                   text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        aria-label="Dismiss"
      >
        <X className="w-3 h-3" />
      </button>

      {/* Pointer/Arrow with enhanced styling */}
      <div
        aria-hidden
        className="absolute animate-bounce-slow"
        style={{
          right: 20,
          bottom: -10,
          width: 0,
          height: 0,
          borderLeft: "10px solid transparent",
          borderRight: "10px solid transparent",
          borderTop: "10px solid",
          borderTopColor: "rgb(43, 190, 180)", // primary color
        }}
      />
      
      {/* Dark mode arrow */}
      <div
        aria-hidden
        className="absolute animate-bounce-slow dark:block hidden"
        style={{
          right: 20,
          bottom: -10,
          width: 0,
          height: 0,
          borderLeft: "10px solid transparent",
          borderRight: "10px solid transparent",
          borderTop: "10px solid",
          borderTopColor: "rgb(15, 93, 93)", // secondary color
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Header with Icon */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 id="askbq-coachmark-title" className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Unlock BlocIQ AI
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Your AI Property Assistant
            </p>
          </div>
        </div>

        {/* Description */}
        <p id="askbq-coachmark-desc" className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 mb-6">
          Click the <span className="font-semibold text-primary">Brain icon</span> in the bottom-right to start your free trial of Ask BlocIQ. 
          Get instant answers to your property management questions!
        </p>

        {/* Features List */}
        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <div className="w-1.5 h-1.5 bg-primary rounded-full" />
            <span>UK leasehold expertise</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <div className="w-1.5 h-1.5 bg-secondary rounded-full" />
            <span>Document analysis</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <div className="w-1.5 h-1.5 bg-primary rounded-full" />
            <span>Compliance guidance</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={dismiss}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold
                       bg-gradient-to-r from-primary to-secondary text-white 
                       hover:from-primary/90 hover:to-secondary/90 
                       shadow-lg hover:shadow-xl transition-all duration-300
                       transform hover:scale-105"
          >
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={dismiss}
            className="px-4 py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 
                       hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200
                       border border-slate-200 dark:border-slate-700"
          >
            Maybe Later
          </button>
        </div>

        {/* Trial Badge */}
        <div className="mt-4 text-center">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <Sparkles className="w-3 h-3 mr-1" />
            Free Trial Available
          </span>
        </div>
      </div>
    </div>
  );
}
