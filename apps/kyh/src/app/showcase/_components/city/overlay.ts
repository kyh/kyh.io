import type { Line } from "@/lib/chat";
import { CHAT_BUBBLE_CLASS } from "@/components/chat-bubble";
import { gradientOf } from "@/lib/color";
import { CURSOR_ARROW } from "@/components/cursor";
import { clamp01, lerp } from "./ease";

const SVG = "http://www.w3.org/2000/svg";

/** What rises now and then from the town's people: a path in a 24×24 box, and its fill. */
export interface Emote {
  d: string;
  fill: string;
}

interface Bubble {
  element: HTMLDivElement;
  text: HTMLSpanElement;
  icon: HTMLImageElement;
  seen: boolean;
}

interface Puff {
  element: HTMLDivElement;
  path: SVGPathElement;
  seen: boolean;
}

interface Pointer {
  element: HTMLDivElement;
  line: HTMLSpanElement;
  seen: boolean;
}

const showLine = (
  element: HTMLSpanElement,
  line: Line | null,
  look: { color: string; hue: string },
) => {
  element.hidden = line === null;

  if (!line) {
    return;
  }

  if (element.textContent !== line.text) {
    element.textContent = line.text;
  }

  const typing = String(line.typing);

  if (element.dataset.typing !== typing) {
    element.dataset.typing = typing;
  }

  const background = gradientOf(look);

  if (element.dataset.background !== background) {
    element.dataset.background = background;
    element.style.background = background;
  }
};

const makeLine = () => {
  const line = document.createElement("span");
  line.className = `${CHAT_BUBBLE_CLASS} city-chat`;
  line.hidden = true;

  return line;
};

const makeBubble = (root: HTMLElement) => {
  const element = document.createElement("div");
  element.className = "city-bubble";
  const icon = document.createElement("img");
  icon.alt = "";
  icon.width = 14;
  icon.height = 14;
  const text = document.createElement("span");
  element.append(icon, text);
  root.append(element);

  return { element, icon, seen: true, text } satisfies Bubble;
};

const makePuff = (root: HTMLElement) => {
  const element = document.createElement("div");
  element.className = "city-emote";
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(SVG, "path");
  svg.append(path);
  element.append(svg);
  root.append(element);

  return { element, path, seen: true } satisfies Puff;
};

const RISE = 34;
const SWAY = 5;

let pointersMade = 0;

const arrowGradient = (svg: SVGSVGElement) => {
  pointersMade += 1;
  const id = `city-pointer-${pointersMade}`;
  const defs = document.createElementNS(SVG, "defs");
  const gradient = document.createElementNS(SVG, "linearGradient");
  gradient.id = id;
  gradient.setAttribute("x2", "0");
  gradient.setAttribute("y2", "1");

  for (const [offset, stop] of [
    ["0", "var(--pointer-hue)"],
    ["1", "currentColor"],
  ] as const) {
    const element = document.createElementNS(SVG, "stop");
    element.setAttribute("offset", offset);
    element.style.stopColor = stop;
    gradient.append(element);
  }

  defs.append(gradient);
  svg.append(defs);

  return `url(#${id})`;
};

const makePointer = (root: HTMLElement) => {
  const element = document.createElement("div");
  element.className = "city-pointer";
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("width", "18");
  svg.setAttribute("height", "24");
  svg.setAttribute("viewBox", "0 0 18 24");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(SVG, "path");
  path.setAttribute("d", CURSOR_ARROW);
  path.setAttribute("fill", arrowGradient(svg));
  path.setAttribute("stroke", "var(--pointer-hue)");
  path.setAttribute("stroke-width", "2");
  svg.append(path);
  const line = makeLine();
  element.append(svg, line);
  root.append(element);

  return { element, line, seen: true } satisfies Pointer;
};

const sweep = <K, T extends { element: HTMLElement; seen: boolean }>(items: Map<K, T>) => {
  for (const [id, item] of items) {
    if (item.seen) {
      item.seen = false;
    } else {
      item.element.remove();
      items.delete(id);
    }
  }
};

export const createOverlay = (root: HTMLElement | null) => {
  const bubbles = new Map<number, Bubble>();
  const puffs = new Map<number, Puff>();
  const pointers = new Map<string, Pointer>();
  const mine = makeLine();
  mine.classList.add("city-mine");
  root?.append(mine);

  return {
    bubble: (id: number, line: { text: string; icon: string }, x: number, y: number) => {
      if (!root) {
        return;
      }

      const bubble = bubbles.get(id) ?? makeBubble(root);
      bubbles.set(id, bubble);
      bubble.seen = true;

      if (bubble.text.textContent !== line.text) {
        bubble.text.textContent = line.text;
      }

      if (bubble.icon.getAttribute("src") !== line.icon) {
        bubble.icon.src = line.icon;
      }

      bubble.element.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
    },
    dispose: () => {
      for (const { element } of [...bubbles.values(), ...puffs.values(), ...pointers.values()]) {
        element.remove();
      }

      mine.remove();
      bubbles.clear();
      puffs.clear();
      pointers.clear();
    },
    emote: (id: number, emote: Emote, x: number, y: number, age: number) => {
      if (!root) {
        return;
      }

      const puff = puffs.get(id) ?? makePuff(root);
      puffs.set(id, puff);
      puff.seen = true;

      if (puff.path.getAttribute("d") !== emote.d) {
        puff.path.setAttribute("d", emote.d);
        puff.path.setAttribute("fill", emote.fill);
      }

      const size = lerp(0.4, 1, clamp01(age / 0.15));
      const sway = Math.sin(age * Math.PI * 2) * SWAY;
      puff.element.style.opacity = String(Math.min(1, (1 - age) / 0.35));
      puff.element.style.transform = `translate3d(${(x + sway).toFixed(1)}px, ${(y - age * RISE).toFixed(1)}px, 0) scale(${size.toFixed(2)})`;
    },
    end: () => {
      sweep(bubbles);
      sweep(puffs);
      sweep(pointers);
    },
    mine: (line: Line | null, look: { color: string; hue: string }, x: number, y: number) => {
      showLine(mine, line, look);

      if (line) {
        mine.style.transform = `translate3d(${Math.round(x + 6)}px, ${Math.round(y + 10)}px, 0)`;
      }
    },
    pointer: (
      id: string,
      look: { color: string; hue: string; holding: boolean },
      line: Line | null,
      x: number,
      y: number,
    ) => {
      if (!root) {
        return;
      }

      const pointer = pointers.get(id) ?? makePointer(root);
      pointers.set(id, pointer);
      pointer.seen = true;
      pointer.element.style.color = look.color;
      pointer.element.style.setProperty("--pointer-hue", look.hue);
      pointer.element.dataset.holding = String(look.holding);
      showLine(pointer.line, line, look);
      pointer.element.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
    },
  };
};

export type Overlay = ReturnType<typeof createOverlay>;
