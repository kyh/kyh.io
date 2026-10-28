"use client";

// The theme's hat, worn tilted on the corner of the homepage's icon: the hat
// the showcase's town draws for it, a witch's at Halloween, Santa's at
// Christmas, pictured on the server (`hat-pictures.ts`). The picture's origin
// is the brim's middle, so that's the point set on the corner.
//
// It can be picked up and put on something else: an app's icon, a folder, a
// dock icon, the visitor's avatar, anything marked `data-hat-perch`. Let go
// near one's top-right corner and it's worn there (`perch.ts`), else it goes
// back on the logo. Leaving the homepage puts it back on the logo.
import { useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useSvgId } from "@/lib/svg-id";
import type { HatPictures } from "./hat-pictures";
import type { Perch } from "./perch";
import { HOME, perchFor } from "./perch";
import { ShadeDots } from "./piece";
import { useTheme } from "./store";

/** Pixels to a picture unit (a town cell is 100). */
const SCALE = 0.32;
const TILT = 20;
/** A shade dot, in picture units: two pixels, as the town's are. */
const DOT = 2 / SCALE;
/** Where on a perch the brim sits: in from its top-right corner, as `top-[5px] right-[7px]`. */
const IN_FROM_RIGHT = 7;
const DOWN_FROM_TOP = 5;

interface Point {
  x: number;
  y: number;
}

const perchesOnScreen = () =>
  [...document.querySelectorAll<HTMLElement>("[data-hat-perch]")].flatMap((element) => {
    const rect = element.getBoundingClientRect();
    const key = element.dataset.hatPerch;
    if (!key || rect.width === 0) {
      return [];
    }
    const perch: Perch = { key, x: rect.right - IN_FROM_RIGHT, y: rect.top + DOWN_FROM_TOP };
    return [{ element, perch }];
  });

export const ThemeHat = ({ pictures }: { pictures: HatPictures }) => {
  const picture = pictures[useTheme()];
  const dots = useSvgId("hat-dots");
  const still = useReducedMotion();
  /** What it's worn on away from the logo; null on the logo. */
  const [host, setHost] = useState<HTMLElement | null>(null);
  /** Where its brim is while it's carried. */
  const [held, setHeld] = useState<Point | null>(null);
  const hat = useRef<HTMLSpanElement>(null);
  const landFrom = useRef<Point | null>(null);
  const carrying = useRef<AbortController | null>(null);

  useEffect(() => () => carrying.current?.abort(), []);

  // Let go, it settles from where it was dropped onto where it's worn.
  useLayoutEffect(() => {
    const from = landFrom.current;
    const placed = hat.current;
    if (held || !from || !placed) {
      return;
    }
    landFrom.current = null;
    const to = placed.getBoundingClientRect();
    if (still) {
      return;
    }
    placed.animate(
      [
        { scale: 1.15, translate: `${from.x - to.left}px ${from.y - to.top}px` },
        { scale: 1, translate: "0 0" },
      ],
      { duration: 380, easing: "cubic-bezier(0.3, 1.35, 0.5, 1)" },
    );
  }, [held, still]);

  if (!picture) {
    return null;
  }

  const pickUp = (event: React.PointerEvent) => {
    const placed = hat.current;
    if (event.button !== 0 || !placed) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const at = placed.getBoundingClientRect();
    const grip = { x: at.left - event.clientX, y: at.top - event.clientY };
    const brimAt = (move: PointerEvent) => ({ x: move.clientX + grip.x, y: move.clientY + grip.y });
    carrying.current?.abort();
    const carry = new AbortController();
    carrying.current = carry;
    const { signal } = carry;
    const drop = (up: PointerEvent) => {
      carry.abort();
      const brim = brimAt(up);
      const perches = perchesOnScreen();
      const key = perchFor(
        brim,
        perches.map(({ perch }) => perch),
      );
      landFrom.current = brim;
      setHost(
        key === HOME ? null : (perches.find(({ perch }) => perch.key === key)?.element ?? null),
      );
      setHeld(null);
    };
    window.addEventListener("pointermove", (move) => setHeld(brimAt(move)), { signal });
    window.addEventListener("pointerup", drop, { signal });
    window.addEventListener("pointercancel", drop, { signal });
    setHeld({ x: at.left, y: at.top });
  };

  const [left, top, width, height] = picture.box;
  const drawing = (
    <svg
      viewBox={picture.box.join(" ")}
      className="pointer-events-none absolute touch-none overflow-visible"
      style={{
        height: height * SCALE,
        left: left * SCALE,
        top: top * SCALE,
        width: width * SCALE,
      }}
    >
      <defs>
        <ShadeDots id={dots} size={DOT} />
      </defs>
      <g
        strokeLinecap="round"
        strokeLinejoin="round"
        className={held ? "pointer-events-auto cursor-grabbing" : "pointer-events-auto cursor-grab"}
        onPointerDown={pickUp}
        // Worn on a link, a press on the hat is for the hat.
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        {picture.layers.map((layer, index) =>
          layer.kind === "faces" ? (
            // A hairline of the face's own color closes the seams between facets.
            <g key={index}>
              <path
                d={layer.d}
                fill={layer.fill}
                stroke={layer.fill}
                strokeWidth={0.4}
                vectorEffect="non-scaling-stroke"
              />
              {layer.shaded && <path d={layer.d} fill={`url(#${dots})`} />}
            </g>
          ) : (
            <path
              key={index}
              d={layer.d}
              fill="none"
              stroke={layer.stroke}
              strokeWidth={layer.width}
              vectorEffect="non-scaling-stroke"
            />
          ),
        )}
      </g>
    </svg>
  );

  if (held) {
    return createPortal(
      <span
        ref={hat}
        className="pointer-events-none fixed z-[60] size-0"
        style={{ left: held.x, rotate: `${TILT}deg`, scale: 1.15, top: held.y }}
        aria-hidden="true"
      >
        {drawing}
      </span>,
      document.body,
    );
  }
  const worn = (
    <span
      ref={hat}
      className="pointer-events-none absolute top-[5px] right-[7px] z-[2] size-0"
      style={{ rotate: `${TILT}deg` }}
      aria-hidden="true"
    >
      {drawing}
    </span>
  );
  return host ? createPortal(worn, host) : worn;
};
