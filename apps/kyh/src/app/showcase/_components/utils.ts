import type { DependencyList } from "react";
import { useCallback, useEffect, useState } from "react";
import { useIsomorphicLayoutEffect } from "motion/react";

import type { KeyBindingMap, Options } from "./tinykeys";
import { tinykeys } from "./tinykeys";

export function areIntersecting(el1: HTMLElement, el2: HTMLElement, padding = 0) {
  const rect1 = el1.getBoundingClientRect();
  const rect2 = el2.getBoundingClientRect();

  return !(
    rect1.right + padding < rect2.left ||
    rect1.left - padding > rect2.right ||
    rect1.bottom + padding < rect2.top ||
    rect1.top - padding > rect2.bottom
  );
}

export function clamp(val: number, [min, max]: [number, number]): number {
  return Math.min(Math.max(val, min), max);
}

export function getRandomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

export function useEvent(
  event: string,
  callback: (e: Event) => void,
  deps: DependencyList = [],
  options: AddEventListenerOptions = {},
) {
  useEffect(() => {
    if (event === "resize") {
      callback(new Event("resize"));
    }

    window.addEventListener(event, callback, options);

    return () => window.removeEventListener(event, callback, options);
  }, deps);
}

let globalIsHydrated = false;
export function useIsHydrated() {
  const [isHydrated, setIsHydrated] = useState(globalIsHydrated);

  useIsomorphicLayoutEffect(() => {
    setIsHydrated(true);
    globalIsHydrated = true;
  }, []);

  return isHydrated;
}

export function useShortcuts(keyBindingMap: KeyBindingMap, options?: Options) {
  useEffect(() => {
    return tinykeys(window, keyBindingMap, options);
  }, [keyBindingMap, options]);
}

function parseHashValue<T>(locationHash: string, fallback: T): T {
  const hash = locationHash.slice(1);
  if (!hash) return fallback;
  try {
    // SAFETY: the hash is written exclusively by `setHashState` below as
    // encodeURIComponent(JSON.stringify(val)) of a T; a hand-edited hash that
    // is not valid JSON lands in the catch.
    return JSON.parse(decodeURIComponent(hash)) as T;
  } catch {
    return fallback;
  }
}

export function useHashState<T>(initialValue: T): [T, (val: T) => void] {
  const [internalValue, setInternalValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    return parseHashValue(window.location.hash, initialValue);
  });

  useEvent(
    "hashchange",
    () => {
      setInternalValue(parseHashValue(window.location.hash, initialValue));
    },
    [initialValue],
  );

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
}
