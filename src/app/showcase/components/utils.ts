import type { DependencyList } from "react";
import { useCallback, useEffect, useState } from "react";
import { useIsomorphicLayoutEffect } from "motion/react";

import type { KeyBindingMap, Options } from "./tinykeys";
import { tinykeys } from "./tinykeys";

export function areIntersecting(
  el1: HTMLElement,
  el2: HTMLElement,
  padding = 0,
) {
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
      callback({} as Event);
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

export function useHashState<T>(initialValue?: T): [T, (val: T) => void] {
  const [internalValue, setInternalValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue as T;
    const hash = window.location.hash.slice(1);
    if (initialValue !== undefined && typeof initialValue !== "string") {
      try {
        return hash
          ? (JSON.parse(decodeURIComponent(hash)) as T)
          : initialValue;
      } catch {
        return initialValue;
      }
    }
    return (hash as unknown as T) || (initialValue as T);
  });

  useEvent(
    "hashchange",
    () => {
      const hash = window.location.hash.slice(1);
      if (initialValue !== undefined && typeof initialValue !== "string") {
        try {
          setInternalValue(
            hash
              ? (JSON.parse(decodeURIComponent(hash)) as T)
              : (initialValue as T),
          );
        } catch {
          setInternalValue(initialValue as T);
        }
      } else {
        setInternalValue((hash as unknown as T) || (initialValue as T));
      }
    },
    [initialValue],
  );

  const setHashState = useCallback((val: T) => {
    let hash: string | undefined;
    if (val === undefined || val === null) {
      hash = undefined;
    } else {
      hash =
        typeof val === "string" ? val : encodeURIComponent(JSON.stringify(val));
    }
    if (typeof window !== "undefined") {
      if (hash === undefined) {
        if (window.location.hash) {
          history.replaceState(
            null,
            document.title,
            window.location.pathname + window.location.search,
          );
        }
      } else if (window.location.hash.slice(1) !== hash) {
        window.location.hash = hash;
      }
    }
    setInternalValue(val);
  }, []);

  return [internalValue, setHashState];
}
