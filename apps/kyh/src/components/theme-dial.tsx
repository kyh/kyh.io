"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

import { DialSlider } from "@/components/dial-slider";
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
// on <html>; this store is how React reads it back. Storage is read once: after
// that memory leads, so a dial still works where storage is blocked.
const listeners = new Set<() => void>();
let current: Dial | null = null;

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
  current ??= readDial(stored(DIAL_KEY));
  return current;
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
  current = dial;
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

/** The sliders the toggle turns into; Escape or a press anywhere else turns them back. */
export const ThemeDial = ({ onClose }: { onClose: () => void }) => {
  const dial = useDial();
  const { resolvedTheme, setTheme } = useTheme();
  const root = useRef<HTMLDivElement>(null);
  const light = dial.light ?? (resolvedTheme === "light" ? 100 : 0);
  const hue = dial.hue ?? SLATE_HUE;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    const onPointer = (event: PointerEvent) => {
      if (!(event.target instanceof Node && root.current?.contains(event.target))) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [onClose]);

  return (
    <div ref={root} className="flex gap-2">
      <div className="dial-slot">
        <DialSlider
          label="Brightness"
          min={0}
          max={100}
          step={1}
          value={light}
          focusOnMount
          onChange={(next) => {
            setDial({ ...dial, light: next });
            if (themeOf(next) !== resolvedTheme) {
              setTheme(themeOf(next));
            }
          }}
        />
      </div>
      <div className="dial-slot">
        <DialSlider
          label="Hue"
          min={0}
          max={360}
          step={1}
          value={hue}
          spectrum
          format={(degrees) => `${degrees}°`}
          onChange={(next) => setDial({ ...dial, hue: next })}
        />
      </div>
    </div>
  );
};
