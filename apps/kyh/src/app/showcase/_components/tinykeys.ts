// forked from https://github.com/jamiebuilds/tinykeys
// to fix navigator not being defined in SSR context

const isFocusedOnElement = () => {
  const el = document.activeElement;

  if (!(el instanceof HTMLElement)) {
    return false;
  }

  if (
    el.contentEditable === "true" ||
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT" ||
    el.role === "menuitem"
  ) {
    // It's okay to trigger global keybinds from readonly inputs
    if (el.hasAttribute("readonly")) {
      return false;
    }
    return true;
  }

  return false;
};

/*

MIT License

Copyright (c) 2020 Jamie Kyle

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/

type KeyBindingPress = [string[], string];

/**
 * A map of keybinding strings to event handlers.
 */
type KeyBindingHandler = (event: KeyboardEvent) => void;
export type KeyBindingMap = Record<string, KeyBindingHandler>;

export interface Options {
  ignoreFocus?: boolean;
}

/**
 * These are the modifier keys that change the meaning of keybindings.
 *
 * Note: Ignoring "AltGraph" because it is covered by the others.
 */
const KEYBINDING_MODIFIER_KEYS = ["Shift", "Meta", "Alt", "Control"];

/**
 * Keybinding sequences should timeout if individual key presses are more than
 * 1s apart.
 */
const TIMEOUT = 1000;

/**
 * Parses a "Key Binding String" into its parts
 *
 * grammar    = `<sequence>`
 * <sequence> = `<press> <press> <press> ...`
 * <press>    = `<key>` or `<mods>+<key>`
 * <mods>     = `<mod>+<mod>+...`
 */
const parse = (str: string): KeyBindingPress[] => {
  const MOD = /Mac|iPod|iPhone|iPad/u.test(navigator.platform) ? "Meta" : "Control";

  return str
    .trim()
    .split(" ")
    .map((press) => {
      const parts = press.split("+");
      const key = parts.pop() ?? "";
      const mods = parts.map((mod) => (mod === "$mod" ? MOD : mod));
      return [mods, key];
    });
};

/**
 * This tells us if a series of events matches a key binding sequence either
 * partially or exactly.
 */
const match = (event: KeyboardEvent, press: KeyBindingPress): boolean =>
  !(
    // Allow either the `event.key` or the `event.code`
    // MDN event.key: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key
    // MDN event.code: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code
    (press[1].toUpperCase() !== event.key.toUpperCase() && press[1] !== event.code) ||
    // Ensure all the modifiers in the keybinding are pressed.
    press[0].some((mod) => !event.getModifierState(mod)) ||
    // KEYBINDING_MODIFIER_KEYS (Shift/Control/etc) change the meaning of a
    // keybinding. So if they are pressed but aren't part of this keybinding,
    // then we don't have a match.
    KEYBINDING_MODIFIER_KEYS.some((mod) => !press[0].includes(mod) && event.getModifierState(mod))
  );

/**
 * Subscribes to keybindings.
 *
 * Returns an unsubscribe method.
 *
 * @example
 * ```js
 * import keybindings from "../src/keybindings"
 *
 * keybindings(window, {
 * 	"Shift+d": () => {
 * 		alert("The 'Shift' and 'd' keys were pressed at the same time")
 * 	},
 * 	"y e e t": () => {
 * 		alert("The keys 'y', 'e', 'e', and 't' were pressed in order")
 * 	},
 * 	"$mod+d": () => {
 * 		alert("Either 'Control+d' or 'Meta+d' were pressed")
 * 	},
 * })
 * ```
 */
export const tinykeys = (
  target: Window | HTMLElement,
  keyBindingMap: KeyBindingMap,
  options?: Options,
) => {
  const { ignoreFocus = true } = options ?? {};
  const keyBindings = Object.entries(keyBindingMap).map(
    ([key, handler]): [KeyBindingPress[], KeyBindingHandler] => [parse(key), handler],
  );

  const possibleMatches = new Map<KeyBindingPress[], KeyBindingPress[]>();
  let timer: ReturnType<typeof setTimeout> | null = null;

  const onKeyDown = (event: Event) => {
    if (!(event instanceof KeyboardEvent)) {
      return;
    }

    // Ignore modifier keydown events
    // Note: This works because:
    // - non-modifiers will always return false
    // - if the current keypress is a modifier then it will return true when we check its state
    // MDN: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/getModifierState
    if (event.getModifierState(event.key)) {
      return;
    }

    // Ignore event when a focusable item is focused
    if (ignoreFocus && isFocusedOnElement()) {
      return;
    }

    for (const [sequence, handler] of keyBindings) {
      if (event.key === "/") {
        handler(event);
        continue;
      }

      const prev = possibleMatches.get(sequence);
      const remainingExpectedPresses = prev || sequence;
      const [currentExpectedPress] = remainingExpectedPresses;
      if (!currentExpectedPress) {
        continue;
      }

      const matches = match(event, currentExpectedPress);

      if (!matches) {
        possibleMatches.delete(sequence);
      } else if (remainingExpectedPresses.length > 1) {
        possibleMatches.set(sequence, remainingExpectedPresses.slice(1));
      } else {
        possibleMatches.delete(sequence);
        handler(event);
      }
    }

    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(possibleMatches.clear.bind(possibleMatches), TIMEOUT);
  };

  target.addEventListener("keydown", onKeyDown);
  return () => {
    target.removeEventListener("keydown", onKeyDown);
  };
};
