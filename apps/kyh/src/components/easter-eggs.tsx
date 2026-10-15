"use client";

import { createContext, use, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import type { Discovery } from "@/lib/easter-egg-store";
import type { Found } from "@/lib/easter-eggs";
import { GOLD } from "@/lib/color";
import { getEggs, getServerEggs, subscribeToEggs } from "@/lib/easter-egg-store";
import { EASTER_EGGS, eggById, isComplete } from "@/lib/easter-eggs";

const SHOW_MS = 4000;

interface EasterEggs {
  found: Found;
  total: number;
  complete: boolean;
}

const EasterEggContext = createContext<EasterEggs>({
  complete: false,
  found: [],
  total: EASTER_EGGS.length,
});

/** This visitor's found eggs; find one with `discoverEgg(id)` from anywhere. */
export const useEasterEggs = () => use(EasterEggContext);

const Sparkle = ({ delay, x, y }: { delay: number; x: number; y: number }) => (
  <motion.span
    className="absolute top-1/2 left-1/2 size-1.5 rounded-full"
    style={{ background: GOLD.color }}
    initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
    animate={{ opacity: 0, scale: 1, x, y }}
    transition={{ delay, duration: 0.7, ease: "easeOut" }}
    aria-hidden="true"
  />
);

const BURST = Array.from({ length: 8 }, (_, index) => {
  const angle = (index / 8) * Math.PI * 2;
  return { delay: 0.15 + (index % 2) * 0.05, x: Math.cos(angle) * 26, y: Math.sin(angle) * 26 };
});

const Egg = ({ still }: { still: boolean }) => (
  <span className="relative flex size-8 shrink-0 items-center justify-center">
    <motion.svg
      viewBox="0 0 24 24"
      className="size-7"
      initial={still ? false : { rotate: 0, scale: 0.4 }}
      animate={still ? undefined : { rotate: [0, -14, 12, -8, 0], scale: 1 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="egg-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={GOLD.hue} />
          <stop offset="1" stopColor={GOLD.color} />
        </linearGradient>
      </defs>
      <path
        d="M12 2C8 2 4.5 8.5 4.5 14a7.5 7.5 0 0 0 15 0C19.5 8.5 16 2 12 2Z"
        fill="url(#egg-gold)"
        stroke={GOLD.color}
        strokeWidth="1"
      />
    </motion.svg>
    {!still && BURST.map((spark) => <Sparkle key={`${spark.x},${spark.y}`} {...spark} />)}
  </span>
);

interface ToastProps {
  discovery: Discovery;
  found: Found;
}

const Toast = ({ discovery, found }: ToastProps) => {
  const still = useReducedMotion() ?? false;
  const egg = eggById(discovery.id);
  const complete = isComplete(found);
  return (
    <motion.output
      className="pointer-events-none fixed top-6 left-1/2 z-50 flex items-center gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--panel)] py-2.5 pr-4 pl-3 text-sm shadow-lg"
      initial={{ opacity: 0, scale: 0.9, x: "-50%", y: still ? 0 : -16 }}
      animate={{ opacity: 1, scale: 1, x: "-50%", y: 0 }}
      exit={{ opacity: 0, scale: 0.95, x: "-50%", y: still ? 0 : -8 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <Egg still={still} />
      <span className="flex flex-col">
        <span className="font-medium text-[var(--body-color-highlighted)]">
          {complete ? "Every easter egg found" : `Easter egg found: ${egg.name}`}
        </span>
        <span className="text-xs text-[var(--body-color-faded)]">
          {complete ? "You've gone gold. Look at your cursor." : egg.note}
        </span>
      </span>
      <span
        className="ml-1 rounded-full px-2 py-0.5 font-mono text-xs font-medium text-[#111] tabular-nums"
        style={{ background: `linear-gradient(${GOLD.hue}, ${GOLD.color})` }}
      >
        {found.length}/{EASTER_EGGS.length}
      </span>
    </motion.output>
  );
};

/** Keeps the found eggs, announces each new one, and turns the visitor gold once they're all found. */
export const EasterEggProvider = ({ children }: { children: React.ReactNode }) => {
  const { found, latest } = useSyncExternalStore(subscribeToEggs, getEggs, getServerEggs);
  const complete = isComplete(found);
  // Each find shows until its time is up.
  const [dismissed, setDismissed] = useState<number | null>(null);
  const shown = latest && latest.at !== dismissed ? latest : null;
  useEffect(() => {
    if (!latest) {
      return;
    }
    const timer = window.setTimeout(() => setDismissed(latest.at), SHOW_MS);
    return () => window.clearTimeout(timer);
  }, [latest]);

  // The page-wide cursor turns gold (global.css).
  useEffect(() => {
    if (complete) {
      document.documentElement.dataset.eggs = "all";
    } else {
      delete document.documentElement.dataset.eggs;
    }
  }, [complete]);

  const value = useMemo(() => ({ complete, found, total: EASTER_EGGS.length }), [complete, found]);

  return (
    <EasterEggContext value={value}>
      {children}
      <AnimatePresence>
        {shown && <Toast key={shown.at} discovery={shown} found={found} />}
      </AnimatePresence>
    </EasterEggContext>
  );
};
