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

if (typeof window !== "undefined") {
  const options = { capture: true, passive: true };
  window.addEventListener("pointermove", onPointer, options);
  window.addEventListener("pointerdown", onPointer, options);
  window.addEventListener("touchmove", onTouchMove, options);
  window.addEventListener("touchend", onTouchEnd);
  window.addEventListener("touchcancel", onTouchEnd);
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
