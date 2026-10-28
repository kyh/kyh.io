"use client";

// What hangs in the page's top corners in a theme that has it: cobwebs at
// Halloween (`web.ts`), a spider on each, one walking round its web and one
// dropping on its thread and climbing back. CSS-animated (global.css), under
// the dock and the cursors; a visitor who'd rather not see motion gets the
// spiders sitting still.
//
// They can be played with. A mouse brushing a web pushes its strands aside,
// and they wobble back when it leaves. A spider can be picked off its web and
// carried on its thread; let go, it bounces on the thread (`bungee.ts`) and
// climbs back to where it was taken, and its CSS takes it on from there.
// Both run straight on the DOM, a frame at a time, never through React.
import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

import { lastPointer, subscribeToPointer } from "@/lib/pointer";
import type { Spider as Body } from "./bungee";
import { bounce, climb, SLACK, settled } from "./bungee";
import { themeOf } from "./index";
import { useTheme } from "./store";
import type { Bend } from "./web";
import {
  BEND_REACH,
  HANG,
  HIP,
  spiderLegs,
  WALK,
  walkPath,
  WEB_PATH,
  WEB_SIZE,
  webPath,
} from "./web";

type Side = "left" | "right";
interface Point {
  x: number;
  y: number;
}

/** The bend's spring: how hard it pulls toward the mouse being there or not, and how it's slowed. */
const BEND_STIFFNESS = 170;
const BEND_DAMPING = 9;
/** The longest a spider bounces before it climbs anyway. */
const BOUNCE_MS = 5000;
/** The fastest a spider is thrown, in the web's pixels a second. */
const THROW = 2000;
/** Pixels it keeps inside the screen, carried or bouncing. */
const MARGIN = 14;

/** Where a point on the screen falls in a corner's web: scaled on a phone, mirrored on the right. */
const localIn = (corner: HTMLElement, side: Side, x: number, y: number): Point => {
  const rect = corner.getBoundingClientRect();
  const scale = rect.width / WEB_SIZE;
  return {
    x: (side === "left" ? x - rect.left : rect.right - x) / scale,
    y: (y - rect.top) / scale,
  };
};

/** The web's pixels a spider can be in and still be on the screen (and the page). */
const boundsIn = (corner: HTMLElement, side: Side) => {
  const a = localIn(corner, side, MARGIN, MARGIN);
  const b = localIn(corner, side, window.innerWidth - MARGIN, window.innerHeight - MARGIN);
  const page = localIn(
    corner,
    side,
    0,
    document.documentElement.scrollHeight - window.scrollY - MARGIN,
  );
  return {
    bottom: Math.min(b.y, page.y),
    left: Math.min(a.x, b.x),
    right: Math.max(a.x, b.x),
    top: a.y,
  };
};

type Bounds = ReturnType<typeof boundsIn>;

const clampTo = (bounds: Bounds, { x, y }: Point): Point => ({
  x: Math.min(bounds.right, Math.max(bounds.left, x)),
  y: Math.min(bounds.bottom, Math.max(bounds.top, y)),
});

// Each gait its own <svg>, so its step turns the whole box: the compositor's
// work, where a <path> turning inside one <svg> repaints it every frame.
const Spider = () => (
  <>
    {([0, 1] as const).map((gait) => (
      <svg key={gait} viewBox="0 0 24 24" className="spider-legs" data-gait={gait}>
        <path d={spiderLegs(gait)} />
      </svg>
    ))}
    <svg viewBox="0 0 24 24" className="absolute inset-0 size-full overflow-visible">
      <ellipse cx={9.4} cy={HIP[1]} rx={4.2} ry={3.4} className="spider-body" />
      <circle cx={15.4} cy={HIP[1]} r={2.1} className="spider-body" />
    </svg>
  </>
);

/** A spider taken off its web, and where it goes back to. */
interface Taken {
  phase: "held" | "bounce" | "climb";
  body: Body;
  /** Where its thread is tied. */
  anchor: Point;
  /** The thread it bounces on. */
  length: number;
  /** Where it was taken from, where its CSS picks it up again. */
  home: Point;
  since: number;
  bounds: Bounds;
}

/** A mouse brushing the web pushes it aside, on a spring that wobbles back when it leaves. */
const useBend = (
  side: Side,
  corner: React.RefObject<HTMLDivElement | null>,
  web: React.RefObject<SVGPathElement | null>,
  walker: React.RefObject<HTMLSpanElement | null>,
  still: boolean | null,
) => {
  useEffect(() => {
    if (still) {
      return;
    }
    const bend: Bend = { strength: 0, x: 0, y: 0 };
    let speed = 0;
    let target = 0;
    let frame = 0;
    let last = 0;

    const draw = () => {
      web.current?.setAttribute("d", webPath(bend));
      if (walker.current) {
        walker.current.style.offsetPath = `path("${walkPath(bend)}")`;
      }
    };
    const tick = (now: number) => {
      const seconds = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      speed += (BEND_STIFFNESS * (target - bend.strength) - BEND_DAMPING * speed) * seconds;
      bend.strength += speed * seconds;
      if (Math.abs(target - bend.strength) < 0.002 && Math.abs(speed) < 0.002) {
        bend.strength = target;
        speed = 0;
        frame = 0;
      } else {
        frame = requestAnimationFrame(tick);
      }
      draw();
    };
    const unsubscribe = subscribeToPointer(() => {
      const at = lastPointer();
      if (!corner.current || at?.kind !== "mouse") {
        return;
      }
      // Hung from the page's top and never scaled up, a web is never lower on the screen than
      // this: below it, a web at rest needn't be measured (a forced layout every move).
      if (at.y > WEB_SIZE + BEND_REACH && target === 0 && bend.strength === 0) {
        return;
      }
      const local = localIn(corner.current, side, at.x, at.y);
      const near =
        local.x > -BEND_REACH &&
        local.y > -BEND_REACH &&
        local.x < WEB_SIZE + BEND_REACH &&
        local.y < WEB_SIZE + BEND_REACH;
      // Leaving, the web wobbles back about where the mouse last touched it.
      if (near) {
        bend.x = local.x;
        bend.y = local.y;
      }
      target = near ? 1 : 0;
      if (near || bend.strength !== 0) {
        if (frame === 0) {
          last = performance.now();
          frame = requestAnimationFrame(tick);
        }
        draw();
      }
    });
    return () => {
      unsubscribe();
      cancelAnimationFrame(frame);
    };
  }, [side, corner, web, walker, still]);
};

/** A spider can be picked off its web, carried, let go to bounce on its thread, and climbs home. */
const useBungee = (
  side: Side,
  corner: React.RefObject<HTMLDivElement | null>,
  home: React.RefObject<HTMLSpanElement | null>,
  free: React.RefObject<HTMLSpanElement | null>,
  thread: React.RefObject<SVGLineElement | null>,
  still: boolean | null,
) => {
  useEffect(() => {
    const cornerEl = corner.current;
    const homeEl = home.current;
    const freeEl = free.current;
    const threadEl = thread.current;
    if (!cornerEl || !homeEl || !freeEl || !threadEl) {
      return;
    }
    let taken: Taken | null = null;
    let frame = 0;
    let last = 0;
    let grip: Point = { x: 0, y: 0 };
    let sample = { t: 0, x: 0, y: 0 };

    const draw = () => {
      if (!taken) {
        return;
      }
      const { anchor, body, phase } = taken;
      const dx = body.x - anchor.x;
      const dy = body.y - anchor.y;
      // Head away from where its thread's tied, as it hangs; toward it as it climbs.
      const away = Math.hypot(dx, dy) < 1 ? 90 : (Math.atan2(dy, dx) * 180) / Math.PI;
      freeEl.style.translate = `${body.x}px ${body.y}px`;
      freeEl.style.rotate = `${phase === "climb" ? away + 180 : away}deg`;
      freeEl.dataset.phase = phase;
      threadEl.setAttribute("x1", `${anchor.x}`);
      threadEl.setAttribute("y1", `${anchor.y}`);
      threadEl.setAttribute("x2", `${body.x}`);
      threadEl.setAttribute("y2", `${body.y}`);
    };
    const finish = () => {
      taken = null;
      freeEl.hidden = true;
      threadEl.style.display = "none";
      delete cornerEl.dataset.taken;
    };
    const tick = (now: number) => {
      frame = 0;
      if (!taken || taken.phase === "held") {
        return;
      }
      const seconds = (now - last) / 1000;
      last = now;
      if (taken.phase === "bounce") {
        const body = bounce(taken.body, taken.anchor, taken.length, seconds);
        const kept = clampTo(taken.bounds, body);
        taken.body = {
          vx: kept.x === body.x ? body.vx : 0,
          vy: kept.y === body.y ? body.vy : 0,
          ...kept,
        };
        if (settled(taken.body, taken.anchor, taken.length) || now - taken.since > BOUNCE_MS) {
          taken.phase = "climb";
        }
      } else {
        const body = climb(taken.body, taken.home, seconds);
        if (!body) {
          finish();
          return;
        }
        taken.body = body;
      }
      draw();
      frame = requestAnimationFrame(tick);
    };

    const grab = (event: PointerEvent) => {
      if (event.button !== 0) {
        return;
      }
      event.preventDefault();
      const at = localIn(cornerEl, side, event.clientX, event.clientY);
      if (!taken) {
        const rect = homeEl.getBoundingClientRect();
        const from = localIn(
          cornerEl,
          side,
          rect.left + rect.width / 2,
          rect.top + rect.height / 2,
        );
        // The walker's thread is tied where it's taken from; the dropper's, where it hangs from.
        const anchor = side === "left" ? from : { x: HANG.x, y: HANG.y };
        taken = {
          anchor,
          body: { vx: 0, vy: 0, ...from },
          bounds: boundsIn(cornerEl, side),
          home: from,
          length: Math.hypot(from.x - anchor.x, from.y - anchor.y) + SLACK,
          phase: "held",
          since: 0,
        };
        cornerEl.dataset.taken = "";
        freeEl.hidden = false;
        threadEl.style.display = "";
      }
      cancelAnimationFrame(frame);
      frame = 0;
      taken.phase = "held";
      taken.bounds = boundsIn(cornerEl, side);
      grip = { x: taken.body.x - at.x, y: taken.body.y - at.y };
      sample = { t: event.timeStamp, x: at.x, y: at.y };
      freeEl.setPointerCapture(event.pointerId);
      draw();
    };
    const move = (event: PointerEvent) => {
      if (taken?.phase !== "held") {
        return;
      }
      const at = localIn(cornerEl, side, event.clientX, event.clientY);
      const seconds = (event.timeStamp - sample.t) / 1000;
      if (seconds > 0) {
        const fling = (from: number, to: number, was: number) =>
          Math.max(-THROW, Math.min(THROW, 0.6 * ((to - from) / seconds) + 0.4 * was));
        taken.body = {
          ...clampTo(taken.bounds, { x: at.x + grip.x, y: at.y + grip.y }),
          vx: fling(sample.x, at.x, taken.body.vx),
          vy: fling(sample.y, at.y, taken.body.vy),
        };
      }
      sample = { t: event.timeStamp, x: at.x, y: at.y };
      draw();
    };
    const release = (event: PointerEvent) => {
      if (taken?.phase !== "held") {
        return;
      }
      // A throw held still before letting go isn't one.
      if (event.timeStamp - sample.t > 80) {
        taken.body = { ...taken.body, vx: 0, vy: 0 };
      }
      if (still) {
        finish();
        return;
      }
      taken.phase = "bounce";
      taken.since = performance.now();
      last = taken.since;
      frame = requestAnimationFrame(tick);
    };

    homeEl.addEventListener("pointerdown", grab);
    freeEl.addEventListener("pointerdown", grab);
    freeEl.addEventListener("pointermove", move);
    freeEl.addEventListener("pointerup", release);
    freeEl.addEventListener("pointercancel", release);
    return () => {
      cancelAnimationFrame(frame);
      homeEl.removeEventListener("pointerdown", grab);
      freeEl.removeEventListener("pointerdown", grab);
      freeEl.removeEventListener("pointermove", move);
      freeEl.removeEventListener("pointerup", release);
      freeEl.removeEventListener("pointercancel", release);
      finish();
    };
  }, [side, corner, home, free, thread, still]);
};

const Web = ({ side }: { side: Side }) => {
  const still = useReducedMotion();
  const corner = useRef<HTMLDivElement>(null);
  const web = useRef<SVGPathElement>(null);
  const walker = useRef<HTMLSpanElement>(null);
  const home = useRef<HTMLSpanElement>(null);
  const free = useRef<HTMLSpanElement>(null);
  const thread = useRef<SVGLineElement>(null);
  useBend(side, corner, web, walker, still);
  useBungee(side, corner, home, free, thread, still);

  return (
    <div
      ref={corner}
      className="theme-corner"
      data-side={side}
      style={{ height: WEB_SIZE, width: WEB_SIZE }}
    >
      <div className="theme-corner-mirror">
        <svg viewBox={`0 0 ${WEB_SIZE} ${WEB_SIZE}`} className="block size-full overflow-visible">
          <path ref={web} d={WEB_PATH} className="theme-web" />
          <line ref={thread} className="spider-line" style={{ display: "none" }} />
        </svg>
        {side === "left" ? (
          <span
            ref={(span) => {
              walker.current = span;
              home.current = span;
            }}
            className="spider spider-walk"
            style={{ offsetPath: `path("${WALK}")` }}
          >
            <Spider />
          </span>
        ) : (
          <span className="spider-hang" style={{ left: HANG.x, top: HANG.y }}>
            <span className="spider-thread" />
            <span ref={home} className="spider spider-drop">
              <Spider />
            </span>
          </span>
        )}
        <span ref={free} className="spider spider-free" hidden>
          <Spider />
        </span>
      </div>
    </div>
  );
};

/** Scrolled out of sight, the corners' CSS animations hold still (global.css): nobody sees them beat. */
const usePausedOffscreen = (corners: React.RefObject<HTMLDivElement | null>, shown: boolean) => {
  useEffect(() => {
    const element = corners.current;
    if (!shown || !element) {
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      element.toggleAttribute("data-offscreen", entry?.isIntersecting === false);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [corners, shown]);
};

export const ThemeCorners = () => {
  const { corners } = themeOf(useTheme());
  const ref = useRef<HTMLDivElement>(null);
  usePausedOffscreen(ref, corners !== null);
  if (corners === null) {
    return null;
  }
  return (
    <div ref={ref} className="theme-corners" data-corners={corners} aria-hidden="true">
      <Web side="left" />
      <Web side="right" />
    </div>
  );
};
