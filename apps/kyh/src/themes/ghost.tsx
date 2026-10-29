"use client";

// What follows a mouse at Halloween: a ghost in a sheet, floating after the
// pointer, its sheet streaming out behind it on the air and swinging back
// when it stops (`sheet.ts`). Drawn in the showcase town's hand, as the
// theme's pieces are (`piece.tsx`): a flat white face, its side turned from
// the light shaded and dotted, its folds and outline in ink. Stepped and
// drawn straight on the DOM a frame at a time, never through React. A finger
// gets none, and nor does a visitor who'd rather not see motion.
import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

import { lastPointer, subscribeToPointer } from "@/lib/pointer";
import { useSvgId } from "@/lib/svg-id";
import type { Ghost } from "./sheet";
import { SQUINT_WIDTH, startle } from "./face";
import { createGhost, ghostPaths, stepGhost } from "./sheet";
import { themeOf } from "./index";
import { INK, ShadeDots, townColor } from "./piece";
import { useTheme } from "./store";

/** The box drawn about the head: room for the sheet streaming out any way. */
const BOX = 140;
const FADE_MS = 300;

export const ThemeGhost = () => {
  const { trail } = themeOf(useTheme());
  const still = useReducedMotion();
  const id = useSvgId("ghost");
  const holder = useRef<HTMLSpanElement | null>(null);
  const body = useRef<SVGPathElement | null>(null);
  const shade = useRef<SVGPathElement | null>(null);
  const dots = useRef<SVGPathElement | null>(null);
  const creases = useRef<SVGPathElement | null>(null);
  const outline = useRef<SVGPathElement | null>(null);
  const cheeks = useRef<SVGPathElement | null>(null);
  const eyes = useRef<SVGPathElement | null>(null);
  const mouth = useRef<SVGPathElement | null>(null);
  const shine = useRef<SVGPathElement | null>(null);
  const squints = useRef<SVGPathElement | null>(null);
  const on = trail === "ghost" && !still;

  useEffect(() => {
    if (!on) {
      return;
    }
    let ghost: Ghost | null = null;
    // The mouse, not the pointer: a finger on a touchscreen laptop isn't followed.
    let mouse: { x: number; y: number } | null = null;
    let moved = { x: 0, y: 0 };
    let frame = 0;
    let last = 0;

    const show = (shown: boolean) => {
      holder.current?.animate([{ opacity: shown ? 1 : 0 }], {
        duration: FADE_MS,
        fill: "forwards",
      });
    };
    const draw = (now: number) => {
      if (!ghost || !mouse) {
        frame = 0;
        return;
      }
      stepGhost(ghost, mouse, moved, (now - last) / 1000);
      last = now;
      moved = { x: 0, y: 0 };
      const paths = ghostPaths(ghost);
      holder.current?.style.setProperty("translate", `${ghost.x}px ${ghost.y}px`);
      body.current?.setAttribute("d", paths.body);
      outline.current?.setAttribute("d", paths.body);
      shade.current?.setAttribute("d", paths.shade);
      dots.current?.setAttribute("d", paths.shade);
      creases.current?.setAttribute("d", paths.creases);
      cheeks.current?.setAttribute("d", paths.cheeks);
      cheeks.current?.style.setProperty("opacity", `${paths.blush}`);
      eyes.current?.setAttribute("d", paths.eyes);
      mouth.current?.setAttribute("d", paths.mouth);
      shine.current?.setAttribute("d", paths.shine);
      squints.current?.setAttribute("d", paths.squints);
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

    // Off the page or touched, it fades and rests; the mouse back, it floats on from where it was.
    const leave = () => {
      show(false);
      stop();
    };
    const unsubscribe = subscribeToPointer(() => {
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
      if (!ghost) {
        ghost = createGhost(at);
      }
      if (frame === 0) {
        show(true);
        start();
      }
    });
    // A click anywhere makes it flinch, > <.
    const flinch = (event: PointerEvent) => {
      if (ghost && frame !== 0 && event.pointerType === "mouse") {
        startle(ghost.mood);
      }
    };
    window.addEventListener("pointerdown", flinch, { capture: true, passive: true });
    document.documentElement.addEventListener("mouseleave", leave);
    return () => {
      unsubscribe();
      window.removeEventListener("pointerdown", flinch, { capture: true });
      document.documentElement.removeEventListener("mouseleave", leave);
      stop();
    };
  }, [on]);

  if (!on) {
    return null;
  }
  return (
    <div className="pointer-events-none fixed inset-0 z-[3] overflow-hidden" aria-hidden="true">
      <span ref={holder} className="absolute top-0 left-0 opacity-0">
        <svg
          viewBox={`${-BOX / 2} ${-BOX / 2} ${BOX} ${BOX}`}
          className="absolute overflow-visible"
          style={{ height: BOX, left: -BOX / 2, top: -BOX / 2, width: BOX }}
        >
          <defs>
            <ShadeDots id={`${id}-dots`} size={1} />
          </defs>
          <g strokeLinecap="round" strokeLinejoin="round">
            <path ref={body} style={{ fill: townColor("white") }} />
            <path ref={shade} style={{ fill: townColor("whiteShade") }} />
            <path ref={dots} fill={`url(#${id}-dots)`} />
            <path ref={creases} style={{ fill: "none", stroke: INK, strokeWidth: 0.9 }} />
            <path ref={outline} style={{ fill: "none", stroke: INK, strokeWidth: 1.4 }} />
            {/* A chibi face (`face.ts`): blush, eyes with their shine, > < when squeezed shut. */}
            <path ref={cheeks} style={{ fill: townColor("accentPink") }} />
            <path ref={eyes} style={{ fill: townColor("screen") }} />
            <path ref={mouth} style={{ fill: townColor("screen") }} />
            <path ref={shine} style={{ fill: townColor("white") }} />
            <path
              ref={squints}
              style={{ fill: "none", stroke: townColor("screen"), strokeWidth: SQUINT_WIDTH }}
            />
          </g>
        </svg>
      </span>
    </div>
  );
};
