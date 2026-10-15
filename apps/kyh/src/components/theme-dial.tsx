"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

import { DialSlider } from "@/components/dial-slider";
import { DIAL_KEY, DIAL_PROPERTY, dialValue, readDial, themeOf } from "@/lib/dial";
import type { Brightness } from "@/lib/dial";

// Brightness lives in localStorage (restoreScript applies it before paint) and
// on <html>; this store is how React reads it back. Storage is read once: after
// that memory leads, so the slider still works where storage is blocked.
const listeners = new Set<() => void>();
let current: { light: Brightness } | null = null;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getBrightness = () => {
  if (!current) {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(DIAL_KEY);
    } catch {
      // Blocked storage: start from the theme.
    }
    current = { light: readDial(raw) };
  }
  return current.light;
};

const getServerBrightness = () => null;

export const useBrightness = () =>
  useSyncExternalStore(subscribe, getBrightness, getServerBrightness);

export const setBrightness = (light: Brightness) => {
  const root = document.documentElement;
  const value = dialValue(light);
  if (value === null) {
    root.style.removeProperty(DIAL_PROPERTY);
  } else {
    root.style.setProperty(DIAL_PROPERTY, value);
  }
  root.toggleAttribute("data-dial", value !== null);
  try {
    if (light === null) {
      localStorage.removeItem(DIAL_KEY);
    } else {
      localStorage.setItem(DIAL_KEY, String(light));
    }
  } catch {
    // Private mode: the slider still applies, it just won't be there next visit.
  }
  current = { light };
  for (const listener of listeners) {
    listener();
  }
};

/** A plain tap on the toggle hands brightness back to the theme. */
export const releaseBrightness = () => {
  if (getBrightness() !== null) {
    setBrightness(null);
  }
};

/** The slider the toggle turns into; Escape or a press anywhere else turns it back. */
export const ThemeDial = ({ onClose }: { onClose: () => void }) => {
  const stored = useBrightness();
  const { resolvedTheme, setTheme } = useTheme();
  const root = useRef<HTMLDivElement>(null);
  const light = stored ?? (resolvedTheme === "light" ? 100 : 0);

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
    <div ref={root} className="w-52">
      <DialSlider
        label="Brightness"
        min={0}
        max={100}
        step={1}
        value={light}
        focusOnMount
        onChange={(next) => {
          setBrightness(next);
          if (themeOf(next) !== resolvedTheme) {
            setTheme(themeOf(next));
          }
        }}
      />
    </div>
  );
};
