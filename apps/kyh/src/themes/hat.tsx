"use client";

// The theme's hat, worn tilted on the corner of the homepage's icon: the hat
// the showcase's town draws for it, a witch's at Halloween, Santa's at
// Christmas, pictured on the server (`hat-pictures.ts`). The picture's origin
// is the brim's middle, so that's the point set on the corner.
//
// It can be picked up and put on something else: an app's icon, a folder, a
// dock icon, the visitor's avatar, anything marked `data-hat-perch`. Let go
// near one's top-right corner and it's worn there (`perch.ts`), else it goes
// back on the logo. Leaving the homepage puts it back on the logo. Carried,
// it leans into the way it's dragged, and let go it wobbles as it settles, as
// kwadrants' tags do (`leanFor`, `landing`).
import { useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useSvgId } from "@/lib/svg-id";
import type { HatPictures } from "./hat-pictures";
import type { Perch } from "./perch";
import { HOME, LANDING_MS, landing, leanFor, perchFor } from "./perch";
import { ShadeDots } from "./piece";
import { useTheme } from "./store";

/** Pixels to a picture unit (a town cell is 100). */
const SCALE = 0.32;
const TILT = 20;
/** A shade dot, in picture units: two pixels, as the town's are. */
const DOT = 2 / SCALE;
/**
 * Where on a perch the brim sits, in from its top-right corner: tilted on the
 * corner of an icon, or on top of a title's last letter (`data-hat-sits="text"`),
 * so the text stays readable under it.
 */
const SEATS = {
  corner: { right: 7, top: 5 },
  text: { right: 6, top: -3 },
};
const seatOf = (element: HTMLElement | null) =>
  element?.dataset.hatSits === "text" ? SEATS.text : SEATS.corner;

interface Point {
  x: number;
  y: number;
}

/** Where its brim is while it's carried, and how far it leans into the drag. */
interface Held extends Point {
  lean: number;
}

/** How long after the last move a carried hat stands back up. */
const STILL_MS = 90;

const perchesOnScreen = () =>
  [...document.querySelectorAll<HTMLElement>("[data-hat-perch]")].flatMap((element) => {
    const rect = element.getBoundingClientRect();
    const key = element.dataset.hatPerch;
    // An open folder's apps are gone once it closes, and the hat with them.
    if (!key || rect.width === 0 || element.closest("[role=dialog]")) {
      return [];
    }
    const seat = seatOf(element);
    const perch: Perch = { key, x: rect.right - seat.right, y: rect.top + seat.top };
    return [{ element, perch }];
  });

export const ThemeHat = ({ pictures }: { pictures: HatPictures }) => {
  const picture = pictures[useTheme()];
  const wornDots = useSvgId("hat-dots");
  // The carried copy is drawn while the worn one stays, so its pattern needs its own id.
  const carriedDots = useSvgId("hat-dots");
  const still = useReducedMotion();
  /** What it's worn on away from the logo; null on the logo. */
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [held, setHeld] = useState<Held | null>(null);
  const hat = useRef<HTMLSpanElement>(null);
  const landFrom = useRef<Held | null>(null);
  const carrying = useRef<AbortController | null>(null);
  const carriedHat = useRef<HTMLSpanElement>(null);

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
    placed.animate(landing({ x: from.x - to.left, y: from.y - to.top }, TILT, from.lean), {
      duration: LANDING_MS,
    });
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
    // Taken from where it's seen, mid-landing too; then the landing stops, so
    // the next drop measures where it really rests.
    const at = placed.getBoundingClientRect();
    for (const animation of placed.getAnimations()) {
      animation.cancel();
    }
    const grip = { x: at.left - event.clientX, y: at.top - event.clientY };
    const brimAt = (move: PointerEvent) => ({ x: move.clientX + grip.x, y: move.clientY + grip.y });
    const { pointerId } = event;
    carrying.current?.abort();
    const carry = new AbortController();
    carrying.current = carry;
    const { signal } = carry;
    let lastX = event.clientX;
    let lean = 0;
    let standing = 0;
    signal.addEventListener("abort", () => clearTimeout(standing));
    const drop = (up: PointerEvent) => {
      if (up.pointerId !== pointerId) {
        return;
      }
      carry.abort();
      const brim = brimAt(up);
      const perches = perchesOnScreen();
      const key = perchFor(
        brim,
        perches.map(({ perch }) => perch),
      );
      // The landing starts from the lean on screen, which eases after the drag's.
      const shown = carriedHat.current
        ? Number(getComputedStyle(carriedHat.current).rotate.replace("deg", ""))
        : TILT + lean;
      landFrom.current = { ...brim, lean: Number.isFinite(shown) ? shown - TILT : lean };
      setHost(
        key === HOME ? null : (perches.find(({ perch }) => perch.key === key)?.element ?? null),
      );
      setHeld(null);
    };
    const move = (to: PointerEvent) => {
      if (to.pointerId !== pointerId) {
        return;
      }
      lean = leanFor(to.clientX - lastX);
      lastX = to.clientX;
      const brim = brimAt(to);
      setHeld({ ...brim, lean });
      // Held still, it stands back up.
      clearTimeout(standing);
      standing = window.setTimeout(() => {
        lean = 0;
        setHeld({ ...brim, lean });
      }, STILL_MS);
    };
    window.addEventListener("pointermove", move, { signal });
    window.addEventListener("pointerup", drop, { signal });
    window.addEventListener("pointercancel", drop, { signal });
    setHeld({ lean: 0, x: at.left, y: at.top });
  };

  const [left, top, width, height] = picture.box;
  // Carried, it's drawn again over everything; the worn one stays put, unseen,
  // so the node the press began on keeps it (a finger's capture is lost with it).
  const drawing = (carried: boolean) => {
    const dots = carried ? carriedDots : wornDots;
    return (
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
          className={carried ? undefined : "pointer-events-auto cursor-grab"}
          onPointerDown={carried ? undefined : pickUp}
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
  };

  const seat = seatOf(host);
  const worn = (
    <span
      ref={hat}
      className={`pointer-events-none absolute z-[2] size-0 ${held ? "invisible" : ""}`}
      style={{ right: seat.right, rotate: `${TILT}deg`, top: seat.top }}
      aria-hidden="true"
    >
      {drawing(false)}
    </span>
  );
  return (
    <>
      {host ? createPortal(worn, host) : worn}
      {held &&
        createPortal(
          <span
            ref={carriedHat}
            className="pointer-events-none fixed z-[60] size-0 cursor-grabbing"
            style={{
              left: held.x,
              rotate: `${TILT + held.lean}deg`,
              scale: 1.15,
              top: held.y,
              transition: still ? undefined : "rotate 120ms ease-out",
            }}
            aria-hidden="true"
          >
            {drawing(true)}
          </span>,
          document.body,
        )}
    </>
  );
};
