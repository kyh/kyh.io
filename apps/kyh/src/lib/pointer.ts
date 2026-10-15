// Where this visitor's pointer is on the screen, for everything that follows
// it (the cursor sent to the room, their own chat line, the easter eggs'
// bursts): one set of window listeners for the page, captured so nothing
// underneath can hide a move, instead of one per feature.

export interface Pointer {
  /** Pixels from the viewport's left and top. */
  x: number;
  y: number;
  kind: "mouse" | "touch";
}

let last: Pointer | null = null;
let lifted = false;
const listeners = new Set<() => void>();

const notify = () => {
  for (const listener of listeners) {
    listener();
  }
};

const set = (x: number, y: number, kind: Pointer["kind"]) => {
  last = { kind, x, y };
  lifted = false;
  notify();
};

const onPointer = (event: PointerEvent) =>
  set(event.clientX, event.clientY, event.pointerType === "mouse" ? "mouse" : "touch");

// A finger that scrolls stops sending pointer events; its touches still say where it is.
const onTouchMove = (event: TouchEvent) => {
  const [touch] = event.touches;
  if (touch) {
    set(touch.clientX, touch.clientY, "touch");
  }
};

const onTouchEnd = () => {
  lifted = true;
  notify();
};

// From the first import in the browser, for the page's life.
if (typeof window !== "undefined") {
  const options = { capture: true, passive: true };
  window.addEventListener("pointermove", onPointer, options);
  window.addEventListener("pointerdown", onPointer, options);
  window.addEventListener("touchmove", onTouchMove, options);
  // Not captured: whatever the finger lifted from hears it first, while it's still down here.
  window.addEventListener("touchend", onTouchEnd);
}

/** Where the pointer last was, even after a finger lifts; null before it's moved. */
export const lastPointer = () => last;

/** Whether the last touch has lifted, so nothing should follow it now. */
export const pointerLifted = () => lifted;

/** Hear every move (and a finger lifting). */
export const subscribeToPointer = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
