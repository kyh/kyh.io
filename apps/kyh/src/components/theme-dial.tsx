"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

import { ThemeToggleIcon } from "@/components/theme-toggle";
import {
  DIAL_KEY,
  DIAL_PROPERTIES,
  DIAL_VARS_KEY,
  dialVars,
  NO_DIAL,
  readDial,
  SLATE_HUE,
  themeOf,
  writeDial,
} from "@/lib/dial";
import type { Dial } from "@/lib/dial";

// The dial lives in localStorage (restoreScript applies it before paint) and
// on <html>; this store is how React reads it back.
const listeners = new Set<() => void>();
let current: { raw: string | null; dial: Dial } | null = null;

const stored = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getDial = () => {
  const raw = stored(DIAL_KEY);
  if (current?.raw !== raw) {
    current = { dial: readDial(raw), raw };
  }
  return current.dial;
};

const getServerDial = () => NO_DIAL;

export const useDial = () => useSyncExternalStore(subscribe, getDial, getServerDial);

export const setDial = (dial: Dial) => {
  const root = document.documentElement;
  const vars = dialVars(dial);
  for (const property of DIAL_PROPERTIES) {
    root.style.removeProperty(property);
  }
  for (const [property, value] of vars) {
    root.style.setProperty(property, value);
  }
  root.toggleAttribute("data-dial", dial.light !== null);
  try {
    localStorage.setItem(DIAL_KEY, writeDial(dial));
    localStorage.setItem(DIAL_VARS_KEY, JSON.stringify(vars));
  } catch {
    // Private mode: the dial still applies, it just won't be there next visit.
  }
  current = { dial, raw: writeDial(dial) };
  for (const listener of listeners) {
    listener();
  }
};

/** A plain tap on the toggle hands brightness back to the theme; the hue stays. */
export const releaseBrightness = () => {
  const dial = getDial();
  if (dial.light !== null) {
    setDial({ ...dial, light: null });
  }
};

const hueTrack = `linear-gradient(to right, ${Array.from(
  { length: 7 },
  (_, i) => `oklch(70% 0.12 ${i * 60})`,
).join(", ")})`;

const brightnessTrack = "linear-gradient(to right, #020617, #f8fafc)";

export const ThemeDial = ({ onClose }: { onClose: () => void }) => {
  const dial = useDial();
  const { resolvedTheme, setTheme } = useTheme();
  const first = useRef<HTMLInputElement>(null);
  const light = dial.light ?? (resolvedTheme === "light" ? 100 : 0);
  const hue = dial.hue ?? SLATE_HUE;

  useEffect(() => {
    first.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="flex h-12 items-center gap-3 px-1 text-[var(--body-color)]">
      <button
        type="button"
        aria-label="Close the dials"
        className="flex size-6 shrink-0 items-center justify-center"
        onClick={onClose}
      >
        <ThemeToggleIcon isLight={light >= 50} />
      </button>
      <div className="flex w-36 flex-col gap-3">
        <input
          ref={first}
          type="range"
          aria-label="Brightness"
          className="dial-range"
          min={0}
          max={100}
          value={light}
          style={{ background: brightnessTrack }}
          onChange={(event) => {
            const next = event.currentTarget.valueAsNumber;
            setDial({ ...dial, light: next });
            if (themeOf(next) !== resolvedTheme) {
              setTheme(themeOf(next));
            }
          }}
        />
        <input
          type="range"
          aria-label="Hue"
          className="dial-range"
          min={0}
          max={360}
          value={hue}
          style={{ background: hueTrack }}
          onChange={(event) => setDial({ ...dial, hue: event.currentTarget.valueAsNumber })}
        />
      </div>
      <button
        type="button"
        aria-label="Reset the dials"
        className="text-foreground-faded hover:text-foreground flex size-5 shrink-0 items-center justify-center disabled:opacity-30"
        disabled={dial.light === null && dial.hue === null}
        onClick={() => setDial(NO_DIAL)}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          width="100%"
          height="100%"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      </button>
    </div>
  );
};
