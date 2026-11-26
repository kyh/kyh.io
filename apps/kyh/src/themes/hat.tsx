"use client";

import { useReducedMotion } from "motion/react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useEffectEvent,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

import { useSvgId } from "@/lib/svg-id";
import type { HatPictures } from "./hat-pictures";
import type { Crown } from "./follower/wear";
import type { Perch } from "./perch";
import {
  carryHat,
  crownOf,
  isHatWorn,
  putHatOn,
  setHatGrabber,
  subscribeToHat,
} from "./follower/wear";
import { HOME, LANDING_MS, landing, leanFor, perchFor } from "./perch";
import { ShadeDots } from "./piece";
import { useTheme } from "./store";

const SCALE = 0.32;
const TILT = 20;
const DOT = 2 / SCALE;

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

interface Held extends Point {
  lean: number;
}

const STILL_MS = 90;
const CARRIED = 1.15;
const LIFT_MS = 200;

interface Grip {
  clientX: number;
  clientY: number;
  pointerId: number;
}

const perchesOnScreen = () =>
  [...document.querySelectorAll<HTMLElement>("[data-hat-perch]")].flatMap((element) => {
    const rect = element.getBoundingClientRect();
    const key = element.dataset.hatPerch;

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
  const carriedDots = useSvgId("hat-dots");
  const still = useReducedMotion();
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [held, setHeld] = useState<Held | null>(null);
  const hat = useRef<HTMLSpanElement>(null);
  const landFrom = useRef<Held | null>(null);
  const carrying = useRef<AbortController | null>(null);
  const carriedHat = useRef<HTMLSpanElement>(null);
  const lift = useRef<Crown | null>(null);
  const wornByFollower = useSyncExternalStore(subscribeToHat, isHatWorn, () => false);

  useEffect(() => () => carrying.current?.abort(), []);

  useLayoutEffect(() => {
    const from = lift.current;
    const carried = carriedHat.current;

    if (!held || !from || !carried || !picture) {
      return;
    }

    lift.current = null;

    if (still) {
      return;
    }

    const shown = (picture.box[2] ?? 0) * SCALE;
    carried.animate(
      [
        { rotate: `${from.angle}deg`, scale: from.width / Math.max(shown, 1) },
        { rotate: `${TILT}deg`, scale: CARRIED },
      ],
      { duration: LIFT_MS, easing: "cubic-bezier(0.3, 1.4, 0.6, 1)" },
    );
  }, [held, picture, still]);

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

  const carry = (event: Grip, at: Point, from?: Crown) => {
    const grip = { x: at.x - event.clientX, y: at.y - event.clientY };
    const brimAt = (move: PointerEvent) => ({ x: move.clientX + grip.x, y: move.clientY + grip.y });
    const { pointerId } = event;
    carrying.current?.abort();
    const controller = new AbortController();
    carrying.current = controller;
    const { signal } = controller;
    let lastX = event.clientX;
    let lean = 0;
    let standing = 0;
    signal.addEventListener("abort", () => {
      clearTimeout(standing);
      carryHat(null);
    });

    const drop = (up: PointerEvent) => {
      if (up.pointerId !== pointerId) {
        return;
      }

      controller.abort();
      const brim = brimAt(up);

      const shown = carriedHat.current
        ? Number(getComputedStyle(carriedHat.current).rotate.replace("deg", ""))
        : TILT + lean;

      const angle = Number.isFinite(shown) ? shown : TILT + lean;
      const width = (picture?.box[2] ?? 0) * SCALE * CARRIED;

      const perches = perchesOnScreen();
      const crown = crownOf();
      const toCrown = crown ? Math.hypot(crown.x - brim.x, crown.y - brim.y) : Infinity;

      const toPerch = Math.min(
        ...perches.map(({ perch }) => Math.hypot(perch.x - brim.x, perch.y - brim.y)),
      );

      if (toCrown < toPerch && putHatOn({ ...brim, angle, width })) {
        landFrom.current = null;
        setHost(null);
        setHeld(null);

        return;
      }

      const key = perchFor(
        brim,
        perches.map(({ perch }) => perch),
      );

      landFrom.current = { ...brim, lean: angle - TILT };
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
      carryHat(brim);
      setHeld({ ...brim, lean });
      clearTimeout(standing);
      standing = window.setTimeout(() => {
        lean = 0;
        setHeld({ ...brim, lean });
      }, STILL_MS);
    };

    window.addEventListener("pointermove", move, { signal });
    window.addEventListener("pointerup", drop, { signal });
    window.addEventListener("pointercancel", drop, { signal });
    carryHat(at);
    lift.current = from ?? null;
    setHeld({ lean: 0, ...at });
  };

  const grabbed = useEffectEvent((event: PointerEvent, from: Crown) =>
    carry(event, { x: from.x, y: from.y }, from),
  );

  useEffect(() => {
    setHatGrabber((event, from) => grabbed(event, from));

    return () => setHatGrabber(null);
  }, []);

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

    for (const animation of placed.getAnimations()) {
      animation.cancel();
    }

    carry(event, { x: at.left, y: at.top });
  };

  const [left, top, width, height] = picture.box;

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
          data-hat
          strokeLinecap="round"
          strokeLinejoin="round"
          className={carried ? undefined : "pointer-events-auto cursor-grab"}
          onPointerDown={carried ? undefined : pickUp}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          {picture.layers.map((layer, index) =>
            layer.kind === "faces" ? (
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
      className={`pointer-events-none absolute z-[2] size-0 ${held || wornByFollower ? "invisible" : ""}`}
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
              scale: CARRIED,
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
