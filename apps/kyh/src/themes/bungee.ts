// A spider picked off its web, for `corners.tsx`: held, it's carried on its
// thread; let go, it falls and bounces on the thread as on a bungee, from
// where it was taken, then climbs back up it. In the web's own pixels, +y
// down. Pure.

export interface Spider {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/** Pixels a second squared down. */
const GRAVITY = 1400;
/** The thread's pull per pixel stretched, a second squared. */
const SPRING = 30;
/** How fast its swing dies, a second. */
const DRAG = 1.6;
/** How much thread it's let go with beyond its own, which the bounce hangs below. */
export const SLACK = 30;
/** Pixels a second it climbs. */
const CLIMB = 70;
/** A step's longest, so a slow frame can't fling it. */
const MAX_STEP = 1 / 30;

/**
 * One step of the bounce: gravity, the thread pulling back when it's
 * stretched past `length` (a slack thread pulls nothing), and the air slowing it.
 */
export const bounce = (
  spider: Spider,
  anchor: { x: number; y: number },
  length: number,
  seconds: number,
): Spider => {
  const dt = Math.min(seconds, MAX_STEP);
  const dx = spider.x - anchor.x;
  const dy = spider.y - anchor.y;
  const reach = Math.hypot(dx, dy);
  const stretch = Math.max(0, reach - length);
  const pull = reach > 0 ? (SPRING * stretch) / reach : 0;
  const ax = -pull * dx - DRAG * spider.vx;
  const ay = GRAVITY - pull * dy - DRAG * spider.vy;
  const vx = spider.vx + ax * dt;
  const vy = spider.vy + ay * dt;
  return { vx, vy, x: spider.x + vx * dt, y: spider.y + vy * dt };
};

/** Where the bounce comes to rest: straight down, the thread stretched by its weight. */
export const restingReach = (length: number) => length + GRAVITY / SPRING;

/** Whether it's near enough still, hanging where it rests, to start climbing. */
export const settled = (spider: Spider, anchor: { x: number; y: number }, length: number) =>
  Math.hypot(spider.vx, spider.vy) < 40 &&
  Math.abs(spider.x - anchor.x) < 6 &&
  Math.abs(spider.y - anchor.y - restingReach(length)) < 8;

/** One step of the climb toward home; null once it's there. */
export const climb = (
  spider: Spider,
  home: { x: number; y: number },
  seconds: number,
): Spider | null => {
  const dx = home.x - spider.x;
  const dy = home.y - spider.y;
  const left = Math.hypot(dx, dy);
  const step = CLIMB * Math.min(seconds, MAX_STEP);
  if (left <= step) {
    return null;
  }
  return { vx: 0, vy: 0, x: spider.x + (dx / left) * step, y: spider.y + (dy / left) * step };
};
