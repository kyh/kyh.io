import { useCallback, useEffect, useEffectEvent, useState } from "react";

import type { KeyBindingMap, Options } from "./tinykeys";
import { tinykeys } from "./tinykeys";

export const areIntersecting = (el1: HTMLElement, el2: HTMLElement, padding = 0) => {
  const rect1 = el1.getBoundingClientRect();
  const rect2 = el2.getBoundingClientRect();

  return !(
    rect1.right + padding < rect2.left ||
    rect1.left - padding > rect2.right ||
    rect1.bottom + padding < rect2.top ||
    rect1.top - padding > rect2.bottom
  );
};

export const clamp = (val: number, [min, max]: [number, number]): number =>
  Math.min(Math.max(val, min), max);

// Subscribes once per event name; the handler always sees the latest render.
export const useEvent = (event: string, handler: (e: Event) => void) => {
  const onEvent = useEffectEvent(handler);

  useEffect(() => {
    const listener = (e: Event) => onEvent(e);
    if (event === "resize") {
      listener(new Event("resize"));
    }

    window.addEventListener(event, listener);

    return () => window.removeEventListener(event, listener);
  }, [event]);
};

export const useShortcuts = (keyBindingMap: KeyBindingMap, options?: Options) => {
  useEffect(() => tinykeys(window, keyBindingMap, options), [keyBindingMap, options]);
};

const parseHashValue = <T>(locationHash: string, fallback: T): T => {
  const hash = locationHash.slice(1);
  if (!hash) {
    return fallback;
  }
  try {
    // SAFETY: the hash is written exclusively by `setHashState` below as
    // encodeURIComponent(JSON.stringify(val)) of a T; a hand-edited hash that
    // is not valid JSON lands in the catch.
    return JSON.parse(decodeURIComponent(hash)) as T;
  } catch {
    return fallback;
  }
};

export const useHashState = <T>(initialValue: T): [T, (val: T) => void] => {
  const [internalValue, setInternalValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    return parseHashValue(window.location.hash, initialValue);
  });

  useEvent("hashchange", () => {
    setInternalValue(parseHashValue(window.location.hash, initialValue));
  });

  const setHashState = useCallback((val: T) => {
    if (typeof window !== "undefined") {
      if (val === undefined || val === null) {
        if (window.location.hash) {
          history.replaceState(
            null,
            document.title,
            window.location.pathname + window.location.search,
          );
        }
      } else {
        const hash = encodeURIComponent(JSON.stringify(val));
        if (window.location.hash.slice(1) !== hash) {
          window.location.hash = hash;
        }
      }
    }
    setInternalValue(val);
  }, []);

  return [internalValue, setHashState];
};
