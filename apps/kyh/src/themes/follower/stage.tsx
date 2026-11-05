"use client";

// Runs a theme's follower (`creature.ts`) after the mouse: created where the
// mouse is, stepped and posed a frame at a time straight on the DOM, never
// through React, its parts found once by their `data-part` (and its layers by
// their `data-layer`, restacked nearest last as it turns); a click anywhere
// pokes it; off the page or touched, it fades and rests, and the mouse back,
// it carries on from where it was. What it says floats over its head in a
// bubble, in the town's sign colors. Loaded with the follower's own chunk,
// only in its theme (`index.tsx`).
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

import { lastPointer, subscribeToPointer } from "@/lib/pointer";
import type { Creature, Part } from "./creature";
import { INK, townColor } from "../piece";

const FADE_MS = 300;
const POP_MS = 220;

/** The box its <svg> draws, in its own pixels about where it is. */
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

const apply = (element: SVGElement, part: Part) => {
  if (part.d !== undefined) {
    element.setAttribute("d", part.d);
  }
  if (part.transform !== undefined) {
    element.setAttribute("transform", part.transform);
  }
  if (part.opacity !== undefined) {
    element.style.setProperty("opacity", `${part.opacity}`);
  }
};

export const Stage = <State,>({
  creature,
  box,
  size = 1,
  children,
}: {
  creature: Creature<State>;
  box: Box;
  /** How big it's drawn, to its own pixels (and so its bubble's offset). */
  size?: number;
  children: ReactNode;
}) => {
  const holder = useRef<HTMLSpanElement>(null);
  const drawing = useRef<SVGSVGElement>(null);
  const bubble = useRef<HTMLSpanElement>(null);
  const words = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const parts = new Map<string, SVGElement[]>();
    for (const element of drawing.current?.querySelectorAll<SVGElement>("[data-part]") ?? []) {
      const name = element.dataset.part ?? "";
      parts.set(name, [...(parts.get(name) ?? []), element]);
    }
    const layers = new Map<string, SVGElement>();
    for (const element of drawing.current?.querySelectorAll<SVGElement>("[data-layer]") ?? []) {
      layers.set(element.dataset.layer ?? "", element);
    }
    let stacked = "";
    // Restacked only when the order changes: moving a node is cheap, but not every frame.
    const restack = (order: readonly string[]) => {
      const key = order.join(" ");
      if (key === stacked) {
        return;
      }
      stacked = key;
      for (const name of order) {
        const layer = layers.get(name);
        layer?.parentNode?.append(layer);
      }
    };
    let state: State | null = null;
    // The mouse, not the pointer: a finger on a touchscreen laptop isn't followed.
    let mouse: { x: number; y: number } | null = null;
    let moved = { x: 0, y: 0 };
    let said: string | null = null;
    let frame = 0;
    let last = 0;

    const show = (shown: boolean) => {
      holder.current?.animate([{ opacity: shown ? 1 : 0 }], {
        duration: FADE_MS,
        fill: "forwards",
      });
    };
    const speak = (line: string | null) => {
      said = line;
      const popup = bubble.current;
      if (!popup || !words.current) {
        return;
      }
      if (line === null) {
        popup.animate([{ opacity: 0, scale: 0.8 }], { duration: 160, fill: "forwards" });
        return;
      }
      words.current.textContent = line;
      popup.animate(
        [
          { opacity: 0, scale: 0.4 },
          { opacity: 1, scale: 1 },
        ],
        { duration: POP_MS, easing: "cubic-bezier(0.3, 1.6, 0.6, 1)", fill: "forwards" },
      );
    };
    const draw = (now: number) => {
      if (state === null || !mouse) {
        frame = 0;
        return;
      }
      creature.step(state, mouse, moved, (now - last) / 1000);
      last = now;
      moved = { x: 0, y: 0 };
      const pose = creature.pose(state);
      holder.current?.style.setProperty("translate", `${pose.at.x}px ${pose.at.y}px`);
      bubble.current?.style.setProperty(
        "translate",
        `${pose.bubble.x * size}px ${pose.bubble.y * size}px`,
      );
      for (const [name, part] of Object.entries(pose.parts)) {
        for (const element of parts.get(name) ?? []) {
          apply(element, part);
        }
      }
      if (pose.order) {
        restack(pose.order);
      }
      if (pose.say !== said) {
        speak(pose.say);
      }
      frame = requestAnimationFrame(draw);
    };
    const start = () => {
      if (frame === 0) {
        last = performance.now();
        frame = requestAnimationFrame(draw);
      }
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const leave = () => {
      show(false);
      stop();
    };
    const follow = () => {
      const at = lastPointer();
      if (at?.kind !== "mouse") {
        if (frame !== 0) {
          leave();
        }
        return;
      }
      if (mouse) {
        moved = { x: moved.x + at.x - mouse.x, y: moved.y + at.y - mouse.y };
      }
      mouse = { x: at.x, y: at.y };
      if (state === null) {
        state = creature.create(at);
      }
      if (frame === 0) {
        show(true);
        start();
      }
    };
    const unsubscribe = subscribeToPointer(follow);
    // Loaded after the mouse first moved: it comes in where the mouse is, not on the next move,
    // unless the mouse has left the page while it loaded.
    if (document.documentElement.matches(":hover")) {
      follow();
    }
    const poke = (event: PointerEvent) => {
      if (state !== null && frame !== 0 && event.pointerType === "mouse") {
        creature.poke(state, { x: event.clientX, y: event.clientY });
      }
    };
    window.addEventListener("pointerdown", poke, { capture: true, passive: true });
    document.documentElement.addEventListener("mouseleave", leave);
    return () => {
      unsubscribe();
      window.removeEventListener("pointerdown", poke, { capture: true });
      document.documentElement.removeEventListener("mouseleave", leave);
      stop();
    };
  }, [creature, size]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[3] overflow-hidden" aria-hidden="true">
      <span ref={holder} className="absolute top-0 left-0 opacity-0">
        <svg
          ref={drawing}
          viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}
          className="absolute overflow-visible"
          style={{ height: box.height, left: box.x, top: box.y, width: box.width }}
        >
          <g
            strokeLinecap="round"
            strokeLinejoin="round"
            transform={size === 1 ? undefined : `scale(${size})`}
          >
            {children}
          </g>
        </svg>
        <span ref={bubble} className="absolute top-0 left-0 opacity-0">
          <span
            ref={words}
            className="absolute bottom-0 left-0 -translate-x-1/2 rounded-full border-[1.5px] px-2.5 py-1 text-xs font-medium whitespace-nowrap"
            style={{
              background: townColor("signBoard"),
              borderColor: INK,
              color: townColor("signText"),
            }}
          />
        </span>
      </span>
    </div>
  );
};
