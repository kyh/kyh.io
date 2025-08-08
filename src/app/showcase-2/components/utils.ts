import * as React from "react";
import { useEffect } from "react";
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
  deps: React.DependencyList = [],
  options: AddEventListenerOptions = {},
) {
  React.useEffect(() => {
    if (event === "resize") {
      callback({} as Event);
    }

    window.addEventListener(event, callback, options);

    return () => window.removeEventListener(event, callback, options);
  }, deps);
}

let globalIsHydrated = false;

/** Returns whether the app has been hydrated. */
export function useIsHydrated() {
  const [isHydrated, setIsHydrated] = React.useState(globalIsHydrated);

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
