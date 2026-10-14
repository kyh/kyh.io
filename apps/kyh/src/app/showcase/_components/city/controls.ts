// The rules of the visitor's hands, apart from the drawing, so each can be
// tested on its own: which building is lit, when the flyover gives the camera
// back and takes it again, whether a press was a tap, a drag or a pinch, and
// what the keys do. engine.ts feeds these the browser's events and draws
// what they decide.

/** Left alone this long, the flyover picks up again. */
export const IDLE_MS = 30_000;
/** A press that travels farther than this, in CSS pixels, is a drag, not a tap. */
export const DRAG_THRESHOLD = 5;

/**
 * Whether a pointer move over the town is a hover: a mouse that moved. A move
 * of nothing is the browser rechecking what's under a resting cursor, as it
 * does when the town glides beneath it, and leaves the flyover running.
 */
export const isHover = (pointerType: string, dx: number, dy: number) =>
  pointerType === "mouse" && (dx !== 0 || dy !== 0);

interface SpotlightPorts {
  now: () => number;
  /** The visitor took the camera; whatever was steering it lets go. */
  onTake: () => void;
  /** The flyover took the camera, or let it go. */
  onTour: (touring: boolean) => void;
  /** Reduced motion: the flyover never runs. */
  still: boolean;
}

/**
 * Which building is lit, and whether the flyover has the camera. Three things
 * light a building and the first of them wins: a pin (hovered or focused),
 * the mouse over it, then the flyover passing it. Lighting a building leaves
 * the camera be; only the visitor moving it stops the flyover, which starts
 * again once they've left it alone for IDLE_MS, unless they paused it.
 */
export const createSpotlight = <T>({ now, onTake, onTour, still }: SpotlightPorts) => {
  let pin: T | null = null;
  let pointer: T | null = null;
  let passing: T | null = null;
  let touring = false;
  let paused = false;
  let idleSince = now();
  const setTouring = (next: boolean) => {
    if (touring !== next) {
      touring = next;
      onTour(next);
    }
  };
  const take = () => {
    idleSince = now();
    setTouring(false);
    passing = null;
    onTake();
  };
  return {
    /** Something picked up: no building stays lit under the hand. */
    grab: () => {
      take();
      pointer = null;
    },
    /** The mouse moved onto `hit`, or open ground. */
    hover: (hit: T | null) => {
      pointer = hit;
    },
    /** Whether the flyover should take the camera back: nothing pressed, and the camera left alone long enough. */
    idle: (pressed: boolean) =>
      !touring && !paused && !still && !pressed && now() - idleSince > IDLE_MS,
    /** The mouse left the town. A press still down keeps what it's on. */
    leave: (pressed: boolean) => {
      if (!pressed) {
        pointer = null;
      }
    },
    get lit() {
      return pin ?? pointer ?? passing;
    },
    /** The flyover is passing this building, or none. */
    pass: (entry: T | null) => {
      if (touring) {
        passing = entry;
      }
    },
    /** The visitor stopped the flyover: it stays stopped until played again. */
    pause: () => {
      take();
      paused = true;
    },
    /** A pin hovered or focused, or null once it's left. */
    pin: (entry: T | null) => {
      pin = entry;
    },
    /** The flyover takes the camera; false if it already has it, or never runs. */
    play: () => {
      paused = false;
      if (touring || still) {
        return false;
      }
      setTouring(true);
      return true;
    },
    /** The building under the mouse, or under a finger's first tap. */
    get pointer() {
      return pointer;
    },
    /** The town moved under a resting mouse: light what's under it now. */
    recheck: (hit: T | null) => {
      pointer = hit;
    },
    /** The visitor takes the camera: the flyover stops and lets its building go. */
    take,
    /**
     * A tap on `hit`, or on open ground: the building to open, if any. A mouse
     * opens at once; a finger can't hover, so its first tap shows the building
     * and its second opens it.
     */
    tap: (hit: T | null, pointerType: string): T | null => {
      if (hit && (pointerType === "mouse" || pointer === hit)) {
        return hit;
      }
      pointer = hit;
      return null;
    },
    get touring() {
      return touring;
    },
  };
};

/** What a press moving does to the view. */
export type PressMove =
  | { kind: "drag"; dx: number; dy: number; started: boolean }
  | { kind: "pinch"; dx: number; dy: number; zoom: number | null; at: { x: number; y: number } };

/**
 * The pointers pressed on the town and what they amount to. One moving past
 * DRAG_THRESHOLD drags the view; a second one makes it a pinch. Only a press
 * that became neither is a tap when it lifts, and a press the browser takes
 * back is never one.
 */
export const createPresses = () => {
  const down = new Map<number, { x: number; y: number }>();
  let dragged = false;
  let from = { x: 0, y: 0 };
  let spread = 0;
  const spreadOf = () => {
    const [a, b] = [...down.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };
  return {
    /** The browser took the gesture back (a system swipe, a long press): never a tap. */
    cancel: (id: number) => {
      down.delete(id);
      if (down.size === 0) {
        spread = 0;
      }
    },
    get count() {
      return down.size;
    },
    has: (id: number) => down.has(id),
    /** A pressed pointer moved: a drag, a pinch, or still within a tap. */
    move: (id: number, x: number, y: number): PressMove | null => {
      const previous = down.get(id);
      if (!previous) {
        return null;
      }
      down.set(id, { x, y });
      const [a, b] = [...down.values()];
      if (down.size === 2 && a && b) {
        const next = spreadOf();
        const zoom = spread > 0 ? next / spread : null;
        spread = next;
        return {
          at: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
          dx: (x - previous.x) / 2,
          dy: (y - previous.y) / 2,
          kind: "pinch",
          zoom,
        };
      }
      const started = !dragged && Math.hypot(x - from.x, y - from.y) > DRAG_THRESHOLD;
      dragged ||= started;
      return dragged ? { dx: x - previous.x, dy: y - previous.y, kind: "drag", started } : null;
    },
    press: (id: number, x: number, y: number) => {
      down.set(id, { x, y });
      if (down.size === 1) {
        dragged = false;
        from = { x, y };
      } else {
        // A second finger: a pinch, which is never a tap.
        spread = spreadOf();
        dragged = true;
      }
    },
    /**
     * A pointer lifted: "tap" if the press was one, "drag" if it ended a drag
     * or pinch, null while other pointers stay down or if it never pressed here.
     */
    release: (id: number, button: number): "tap" | "drag" | null => {
      if (!down.delete(id) || down.size > 0) {
        return null;
      }
      spread = 0;
      if (dragged) {
        return "drag";
      }
      return button === 0 ? "tap" : null;
    },
  };
};

/** What a key does to the view. */
export type KeyMove =
  | { kind: "pan"; dx: number; dy: number }
  | { kind: "zoom"; factor: number }
  | { kind: "turn"; by: 1 | -1 };

/** Which way each arrow moves the view, in screen directions. */
const KEY_PANS = new Map<string, readonly [number, number]>([
  ["ArrowDown", [0, -1]],
  ["ArrowLeft", [1, 0]],
  ["ArrowRight", [-1, 0]],
  ["ArrowUp", [0, 1]],
]);

/** Arrows pan, + (or =) and - zoom, [ and ] turn; letters are for chat; any other key leaves the view be. */
export const keyMove = (key: string): KeyMove | null => {
  const pan = KEY_PANS.get(key);
  if (pan) {
    return { dx: pan[0], dy: pan[1], kind: "pan" };
  }
  if (key === "[" || key === "]") {
    return { by: key === "]" ? 1 : -1, kind: "turn" };
  }
  if (key === "+" || key === "=") {
    return { factor: 1.25, kind: "zoom" };
  }
  return key === "-" ? { factor: 1 / 1.25, kind: "zoom" } : null;
};
