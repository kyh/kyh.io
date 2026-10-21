// What floats over the town in HTML rather than in the drawing: the lines
// visitors say on their way out, what the theme has people send up (a
// heart at Valentine's), other people's pointers and what they're saying,
// and this player's own line. Placed fresh every frame; whatever a
// frame doesn't place is taken away.
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

/** A chat bubble as the site's own cursors draw it; written only where it changed, as it's placed every frame. */
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

const makeBubble = (root: HTMLElement): Bubble => {
  const element = document.createElement("div");
  element.className = "city-bubble";
  const icon = document.createElement("img");
  icon.alt = "";
  icon.width = 14;
  icon.height = 14;
  const text = document.createElement("span");
  element.append(icon, text);
  root.append(element);
  return { element, icon, seen: true, text };
};

const makePuff = (root: HTMLElement): Puff => {
  const element = document.createElement("div");
  element.className = "city-emote";
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(SVG, "path");
  svg.append(path);
  element.append(svg);
  root.append(element);
  return { element, path, seen: true };
};

/** How far an emote rises over its life (px), and how far it sways either side. */
const RISE = 34;
const SWAY = 5;

let pointersMade = 0;

/** The avatar's gradient, light hue down to full color, for an arrow's fill. */
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

const makePointer = (root: HTMLElement): Pointer => {
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
  return { element, line, seen: true };
};

/** Keeps what was placed since the last sweep, and removes the rest. */
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
    /** A visitor's line, its tail on (x, y). */
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
    /**
     * An emote `age` of the way (0 to 1) through its life, rising from (x, y):
     * it pops up, sways as it climbs, and fades out.
     */
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
    /** Takes away whatever this frame didn't place. */
    end: () => {
      sweep(bubbles);
      sweep(puffs);
      sweep(pointers);
    },
    /** This player's own line beside their mouse, or none. */
    mine: (line: Line | null, look: { color: string; hue: string }, x: number, y: number) => {
      showLine(mine, line, look);
      if (line) {
        mine.style.transform = `translate3d(${Math.round(x + 6)}px, ${Math.round(y + 10)}px, 0)`;
      }
    },
    /** Someone else's pointer, in their color, with what they're saying; grabbing while they hold something. */
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
