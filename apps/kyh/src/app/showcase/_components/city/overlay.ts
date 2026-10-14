// What floats over the town in HTML rather than in the drawing: the lines
// visitors say on their way out, other people's pointers and what they're
// saying, and this player's own line. Placed fresh every frame; whatever a
// frame doesn't place is taken away.
const SVG = "http://www.w3.org/2000/svg";
const ARROW =
  "M2.717 2.22918L15.9831 15.8743C16.5994 16.5083 16.1503 17.5714 15.2661 17.5714H9.35976C8.59988 17.5714 7.86831 17.8598 7.3128 18.3783L2.68232 22.7C2.0431 23.2966 1 22.8434 1 21.969V2.92626C1 2.02855 2.09122 1.58553 2.717 2.22918Z";

interface Bubble {
  element: HTMLDivElement;
  text: HTMLSpanElement;
  icon: HTMLImageElement;
  seen: boolean;
}

interface Pointer {
  element: HTMLDivElement;
  line: HTMLSpanElement;
  seen: boolean;
}

/** A line of chat as the overlay draws it: what it says, and whether it's still being typed. */
export interface Line {
  text: string;
  typing: boolean;
}

/** A chat bubble's look, as the site's own cursors draw it. */
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
  element.dataset.typing = String(line.typing);
  element.style.backgroundColor = line.typing ? look.hue : look.color;
  element.style.color = line.typing ? "#111" : "#fff";
};

const makeLine = () => {
  const line = document.createElement("span");
  line.className =
    "chat-bubble city-chat block w-max max-w-60 rounded-xl rounded-tl-sm px-2.5 py-1 font-mono text-xs leading-snug font-medium break-words shadow-sm";
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

const makePointer = (root: HTMLElement): Pointer => {
  const element = document.createElement("div");
  element.className = "city-pointer";
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("width", "18");
  svg.setAttribute("height", "24");
  svg.setAttribute("viewBox", "0 0 18 24");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(SVG, "path");
  path.setAttribute("d", ARROW);
  path.setAttribute("fill", "currentColor");
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
      for (const { element } of [...bubbles.values(), ...pointers.values()]) {
        element.remove();
      }
      mine.remove();
      bubbles.clear();
      pointers.clear();
    },
    /** Takes away whatever this frame didn't place. */
    end: () => {
      sweep(bubbles);
      sweep(pointers);
    },
    /** This player's own line beside their mouse, or none. */
    mine: (line: Line | null, look: { color: string; hue: string }, x: number, y: number) => {
      showLine(mine, line, look);
      mine.style.transform = `translate3d(${Math.round(x + 6)}px, ${Math.round(y + 10)}px, 0)`;
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
