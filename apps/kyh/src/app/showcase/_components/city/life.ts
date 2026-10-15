// The town's life: everything moving on the ground, drawn smoothly between
// ticks; the visitors' lines over their heads; cars and people you can pick
// up, carry and drop; and, through the room, everyone else doing the same.
// The engine hands over pointer positions in the town and a way to put town
// points on screen; this draws the rest.
import type { Scene } from "three";
import { Group } from "three";

import type { Placement } from "./actors";
import type { Placed } from "./draw-landmarks";
import type { Drop, Remote, Spot } from "./net";
import type { Theme } from "./palette";
import type { CityPlan } from "./plan";
import type { Vec3 } from "./sketch";
import type { Pose } from "./traffic";
import { createActors, placement } from "./actors";
import { CURB_TOP } from "./draw-blocks";
import { createNet } from "./net";
import type { Said } from "@/lib/chat";
import { lineOf, SHOW_MS } from "@/lib/chat";
import { ownColor } from "@/lib/color";
import type { Ground, Held } from "./carry";
import { carryTo, flightOf, HANG, LIFT, pickUp, shadowFor, throwOf } from "./carry";
import { createOverlay } from "./overlay";
import { quoteFor } from "./quotes";
import { TICK } from "./traffic";
import { doorwaySize, INSIDE, SAYING } from "./visitors";
import { actorKey, CARS, createWorld, parseActorKey, tickAt, VISITORS, WALKERS } from "./world";
import { clamp, lerp } from "./ease";

/** How high a carried thing hangs, in cells. */
/**
 * Where a carried thing is drawn: slid up its own line of sight to above the
 * tallest roof. The camera is orthographic, so it shows in the same spot, but
 * no building stands in front of it.
 */
const RAISE = 9;
const TICK_MS = TICK * 1000;
/** Ticks the town may fall behind and still catch up by stepping; past this it skips. */
const CATCH_UP = 100;
/** How long the town's cars and people take to all pop in once it opens, and each one (ms). */
const OPENING = 700;
const POP = 150;
/** The little hop a thing makes when it lands (ms). */
const BOUNCE_MS = 340;
/** The most lines up at once, and the zoom (CSS pixels a cell) they need to be readable. */
const SPEAKING = 2;
/** One visitor in this many says something on the way out. */
const TALKATIVE = 3;
const SPEAK_SCALE = 26;
/** A snapshot this many ticks old is still worth catching up from. */
const FRESH = 1200;

interface Air {
  from: Spot;
  heading: number;
  to: Pose;
  start: number;
  flight: number;
  leanX: number;
  leanZ: number;
}

interface Frame {
  /** How far between the last tick and the next, 0 to 1. */
  alpha: number;
  dt: number;
  time: number;
  /** Where each other player's pointer is. */
  hands: Map<string, Spot>;
}

interface Lean {
  x: number;
  z: number;
  leanX: number;
  leanZ: number;
}

export interface LifeOptions {
  scene: Scene;
  plan: CityPlan;
  placed: readonly Placed[];
  theme: Theme;
  overlay: HTMLElement | null;
  /** The room to share the town in; null keeps it to this browser. */
  room: string | null;
  /** A town point on screen, in CSS pixels from the canvas's corner. */
  toScreen: (x: number, y: number, z: number) => { x: number; y: number };
  /** CSS pixels per cell at the current zoom. */
  scale: () => number;
  /** Toward the camera, which turns in quarter turns. */
  view: () => Vec3;
  /** How high what's underfoot is: a roof, a ledge, else the street. */
  surfaceAt: (x: number, z: number) => number;
  size: () => { width: number; height: number };
}

const lerpAngle = (a: number, b: number, k: number) =>
  a + (((((b - a) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * k;

const between = (last: Pose, pose: Pose, alpha: number, out: Placement, y: number) => {
  out.x = lerp(last.x, pose.x, alpha);
  out.z = lerp(last.z, pose.z, alpha);
  out.heading = lerpAngle(last.heading, pose.heading, alpha);
  out.y = y;
  out.leanX = 0;
  out.leanZ = 0;
  out.shadowSize = 0;
};

const KEYS = {
  car: Array.from({ length: CARS }, (_, index) => actorKey("car", index)),
  visitor: Array.from({ length: VISITORS }, (_, index) => actorKey("visitor", index)),
  walker: Array.from({ length: WALKERS }, (_, index) => actorKey("walker", index)),
};

export const createLife = (options: LifeOptions) => {
  const { placed, plan } = options;
  const world = createWorld(
    plan,
    placed.map((entry) => ({ lot: entry.lot, slug: entry.project.slug, wall: entry.bounds })),
    tickAt(Date.now()),
  );
  const projects = new Map(placed.map((entry) => [entry.project.slug, entry.project]));
  const group = new Group();
  const actors = createActors({ cars: CARS, visitors: VISITORS, walkers: WALKERS }, options.theme);
  group.add(...actors.meshes);
  options.scene.add(group);
  /**
   * When the town opened to its cars, passers-by and visitors, who only come
   * out once it's built; null while it's closed. They pop in one after another,
   * as the trucks do, over the first OPENING ms.
   */
  let openedAt: number | null = Number.NEGATIVE_INFINITY;
  const popIn = (index: number, now: number) => {
    const delay = (((index * 37) % 97) / 97) * (OPENING - POP);
    return openedAt === null ? 0 : clamp((now - openedAt - delay) / POP, 0, 1);
  };
  const overlay = createOverlay(options.overlay);
  const cars = Array.from({ length: CARS }, placement);
  const walkers = Array.from({ length: WALKERS }, placement);
  const visitors = Array.from({ length: VISITORS }, placement);
  const shown = new Map<string, Placement>();
  for (const [index, spot] of cars.entries()) {
    shown.set(actorKey("car", index), spot);
  }
  for (const [index, spot] of walkers.entries()) {
    shown.set(actorKey("walker", index), spot);
  }
  for (const [index, spot] of visitors.entries()) {
    shown.set(actorKey("visitor", index), spot);
  }

  const { surfaceAt } = options;
  const underfoot = (): Ground => ({ surfaceAt, view: options.view() });
  let held: Held | null = null;
  /** What other people are holding: key → who. */
  const theirs = new Map<string, string>();
  const air = new Map<string, Air>();
  const leans = new Map<string, Lean>();
  let adopted: string | null = null;
  const born = performance.now();
  let settled = false;

  const startFall = (key: string, from: Spot, to: Pose) => {
    const lean = leans.get(key);
    air.set(key, {
      flight: flightOf(from, to),
      from,
      heading: shown.get(key)?.heading ?? to.heading,
      leanX: lean?.leanX ?? 0,
      leanZ: lean?.leanZ ?? 0,
      start: performance.now(),
      to: { ...to },
    });
    leans.delete(key);
  };

  /** Ticks until a thing let go now has landed and hopped. */
  const landingTick = (from: Spot, to: Pose) =>
    world.tick + Math.ceil((flightOf(from, to) + BOUNCE_MS) / TICK_MS) + 1;

  const net = options.room
    ? createNet({
        onDrop: (drop: Drop) => {
          const pose = world.place(drop.key, drop.state);
          if (pose) {
            theirs.delete(drop.key);
            startFall(drop.key, drop.from, pose);
          }
        },
        onHold: (key, owner) => {
          if (owner === null) {
            theirs.delete(key);
            const parsed = parseActorKey(key);
            const stranded =
              parsed &&
              held?.key !== key &&
              !air.has(key) &&
              world.isHeld(parsed.kind, parsed.index);
            if (stranded) {
              // Its holder left without setting it down: it falls from under
              // their hand (it's drawn up the view ray, clear of roofs), or
              // from where it stood if their hand never showed.
              const hand = leans.get(key);
              const spot = shown.get(key);
              const from = hand
                ? { x: hand.x, y: LIFT + surfaceAt(hand.x, hand.z), z: hand.z }
                : { x: spot?.x ?? 0, y: spot?.y ?? 0, z: spot?.z ?? 0 };
              const landed = world.land(key, from.x, from.z, world.tick);
              if (landed) {
                world.land(key, from.x, from.z, landingTick(from, landed.pose));
                startFall(key, from, landed.pose);
              }
            }
            return;
          }
          if (owner === net?.me) {
            return;
          }
          // Someone else has it, even if we reached for it too.
          theirs.set(key, owner);
          if (held?.key === key) {
            held = null;
          }
          air.delete(key);
          world.hold(key);
        },
        room: options.room,
      })
    : null;
  const now = () => net?.now() ?? Date.now();

  /** A guest takes up the room's town whenever a newer snapshot comes in. */
  const adopt = (target: number) => {
    const snapshot = net?.snapshot;
    if (!net || !snapshot || snapshot === adopted || net.isHost || !net.synced) {
      return;
    }
    adopted = snapshot;
    if (world.restore(snapshot, (key) => air.has(key) || key === held?.key)) {
      world.advanceTo(target, FRESH);
      settled = true;
    }
  };

  /** A thing hanging at `altitude` over the ground point `spot`, swinging as it moves; its shadow straight below. */
  const hang = (key: string, spot: Spot, altitude: number, out: Placement, dt: number) => {
    const lean = leans.get(key) ?? { leanX: 0, leanZ: 0, x: spot.x, z: spot.z };
    const seconds = Math.max(dt, 1e-3);
    const vx = (spot.x - lean.x) / seconds;
    const vz = (spot.z - lean.z) / seconds;
    const k = 1 - Math.exp(-seconds * 9);
    lean.leanX += (clamp(vx * 0.07, -0.55, 0.55) - lean.leanX) * k;
    lean.leanZ += (clamp(vz * 0.07, -0.55, 0.55) - lean.leanZ) * k;
    lean.x = spot.x;
    lean.z = spot.z;
    leans.set(key, lean);
    const floor = surfaceAt(spot.x, spot.z);
    const y = Math.max(floor, altitude);
    // Drawn up the view ray, clear of roofs, where it looks the same.
    const toward = options.view();
    const along = (RAISE - y) / toward[1];
    out.x = spot.x + toward[0] * along;
    out.y = RAISE;
    out.z = spot.z + toward[2] * along;
    out.leanX = lean.leanX;
    out.leanZ = lean.leanZ;
    out.shown = true;
    out.shadowX = spot.x;
    out.shadowZ = spot.z;
    out.shadowY = floor;
    out.shadowSize = shadowFor(y - floor);
  };

  /** A shadow straight under something falling. */
  const shadowUnder = (out: Placement) => {
    out.shadowX = out.x;
    out.shadowZ = out.z;
    out.shadowY = surfaceAt(out.x, out.z);
    out.shadowSize = shadowFor(out.y - out.shadowY);
  };

  /** Mid-fall or mid-hop: true while the fall is still playing. */
  const fall = (key: string, out: Placement, time: number) => {
    const flying = air.get(key);
    if (!flying) {
      return false;
    }
    const elapsed = time - flying.start;
    const u = clamp(elapsed / flying.flight, 0, 1);
    const ground = out.y;
    if (u < 1) {
      const glide = 1 - (1 - u) * (1 - u);
      const reach = Math.hypot(flying.to.x - flying.from.x, flying.to.z - flying.from.z);
      out.x = lerp(flying.from.x, flying.to.x, glide);
      out.z = lerp(flying.from.z, flying.to.z, glide);
      out.y =
        lerp(flying.from.y - 0.18, ground, u * u) + Math.min(0.7, reach * 0.12) * 4 * u * (1 - u);
      out.heading = lerpAngle(flying.heading, flying.to.heading, glide);
      out.leanX = flying.leanX * (1 - u);
      out.leanZ = flying.leanZ * (1 - u);
      shadowUnder(out);
      return true;
    }
    const hop = (elapsed - flying.flight) / BOUNCE_MS;
    if (hop < 1) {
      out.x = flying.to.x;
      out.z = flying.to.z;
      out.heading = flying.to.heading;
      out.y = ground + Math.abs(Math.sin(hop * Math.PI * 1.5)) * 0.11 * (1 - hop);
      out.leanX = 0;
      out.leanZ = 0;
      shadowUnder(out);
      return true;
    }
    air.delete(key);
    return false;
  };

  /** Draws one mover: carried, falling, or going about its way. */
  const draw = (key: string, last: Pose, pose: Pose, out: Placement, y: number, frame: Frame) => {
    if (held?.key === key) {
      hang(key, held.spot, held.altitude, out, frame.dt);
      return;
    }
    const owner = theirs.get(key);
    if (owner !== undefined) {
      const hand = frame.hands.get(owner);
      if (hand) {
        hang(key, hand, surfaceAt(hand.x, hand.z) + HANG, out, frame.dt);
      }
      return;
    }
    between(last, pose, frame.alpha, out, y);
    fall(key, out, frame.time);
  };

  /** The visitors with something to say, their lines over their heads. */
  const speak = (tick: number) => {
    // Too far out to read, the town keeps its talk to itself.
    if (openedAt === null || options.scale() < SPEAK_SCALE) {
      return;
    }
    const { height, width } = options.size();
    const lines: { index: number; age: number; x: number; y: number }[] = [];
    for (const [index, visitor] of world.visitors.entries()) {
      const age = tick - visitor.said;
      const spot = visitors[index];
      if (spot?.shown && visitor.quote % TALKATIVE === 0 && age >= 0 && age < SAYING) {
        const head = options.toScreen(spot.x, spot.y + 0.34, spot.z);
        if (head.x > -80 && head.x < width + 80 && head.y > -40 && head.y < height + 40) {
          lines.push({ age, index, x: head.x, y: head.y });
        }
      }
    }
    // The oldest few: a line stays up until it's done rather than being cut off by a newer one.
    for (const line of lines.toSorted((a, b) => b.age - a.age).slice(0, SPEAKING)) {
      const visitor = world.visitors[line.index];
      const door = visitor ? world.doors[visitor.door] : undefined;
      const project = door ? projects.get(door.slug) : undefined;
      if (visitor && project) {
        overlay.bubble(
          line.index,
          { icon: project.favicon, text: quoteFor(project.slug, project.kind, visitor.quote) },
          line.x,
          line.y,
        );
      }
    }
  };

  /** This player's chat: their draft, their last line until it comes down, and where their mouse is. */
  let draft: string | null = null;
  let said: Said | null = null;
  let hand: { x: number; y: number } | null = null;

  const point = (others: readonly Remote[]) => {
    const { height, width } = options.size();
    for (const other of others) {
      if (other.at) {
        const at = options.toScreen(other.at.x, other.at.y, other.at.z);
        if (at.x > -20 && at.x < width + 20 && at.y > -20 && at.y < height + 20) {
          overlay.pointer(
            other.id,
            { ...other, holding: other.holding !== null },
            lineOf(other.chat),
            at.x,
            at.y,
          );
        }
      }
    }
    if (said && performance.now() >= said.until) {
      said = null;
    }
    const own = lineOf({ said, typing: draft });
    overlay.mine(hand ? own : null, ownColor(), hand?.x ?? 0, hand?.y ?? 0);
  };

  /** Steps the town to `target`, taking up or putting up the room's snapshot. */
  const keepTime = (target: number) => {
    adopt(target);
    const behind = target - world.tick;
    if (behind > CATCH_UP || behind < -2) {
      world.shift(behind);
    } else {
      world.advanceTo(target, CATCH_UP);
    }
    if (net?.isHost) {
      net.publish(world.pack, net.snapshot === null);
    }
  };

  const drawMovers = (frame: Frame) => {
    const shownAt = performance.now();
    for (const [index, car] of world.cars.entries()) {
      const out = cars[index];
      if (out) {
        draw(KEYS.car[index] ?? "", car.last, car.pose, out, 0.012, frame);
        out.shown = settled;
        out.size = popIn(index, shownAt);
      }
    }
    for (const [index, walker] of world.walkers.entries()) {
      const out = walkers[index];
      if (out) {
        const bob = CURB_TOP + Math.abs(Math.sin(walker.phase)) * 0.014;
        draw(KEYS.walker[index] ?? "", walker.last, walker.pose, out, bob, frame);
        out.shown = settled;
        out.size = popIn(CARS + index, shownAt);
      }
    }
    for (const [index, visitor] of world.visitors.entries()) {
      const out = visitors[index];
      if (out) {
        const bob = CURB_TOP + Math.abs(Math.sin(visitor.phase)) * 0.014;
        const key = KEYS.visitor[index] ?? "";
        draw(key, visitor.last, visitor.pose, out, bob, frame);
        const carried = held?.key === key || theirs.has(key);
        out.shown = settled && (visitor.mode !== INSIDE || carried);
        out.size = carried
          ? 1
          : popIn(CARS + WALKERS + index, shownAt) *
            doorwaySize(visitor, world.doors, out.x, out.z);
      }
    }
  };

  return {
    /** The car or person under a screen point, if any is free to pick up. */
    actorAt: (x: number, y: number) => {
      if (openedAt === null) {
        return null;
      }
      const scale = options.scale();
      let best: { key: string; distance: number } | null = null;
      for (const [key, spot] of shown) {
        const [kind] = key;
        const free = spot.shown && !theirs.has(key) && held?.key !== key;
        if (free) {
          const lift = kind === "c" ? 0.08 : 0.14;
          const at = options.toScreen(spot.x, spot.y + lift, spot.z);
          const distance = Math.hypot(at.x - x, at.y - y);
          const reach = kind === "c" ? Math.max(10, scale * 0.24) : Math.max(8, scale * 0.14);
          if (distance < reach && (!best || distance < best.distance)) {
            best = { distance, key };
          }
        }
      }
      return best?.key ?? null;
    },
    /** Move what's being carried. */
    carry: (spot: Spot) => {
      if (!held) {
        return;
      }
      held = carryTo(underfoot(), held, spot, performance.now());
      // Everyone else sees it where it is, so their view of it doesn't jump by the grab's offset.
      net?.point(held.spot);
    },
    debug: () => ({
      adopted: adopted !== null,
      falling: [...air.keys()],
      holding: held?.key ?? null,
      host: net?.isHost ?? true,
      me: net?.me ?? null,
      /** The whole town as text, as a snapshot carries it. */
      pack: () => world.pack(),
      people: net?.people ?? 1,
      /** Where a car or person is drawn on screen, by key. */
      screen: (key: string) => {
        const spot = shown.get(key);
        return spot?.shown ? options.toScreen(spot.x, spot.y + 0.08, spot.z) : null;
      },
      settled,
      status: net?.status ?? "offline",
      synced: net?.synced ?? false,
      theirs: Object.fromEntries(theirs),
      tick: world.tick,
      /** Where a car or person is now, by key. */
      where: (key: string) => world.poseOf(key),
    }),
    dispose: () => {
      net?.destroy();
      overlay.dispose();
      actors.dispose();
      options.scene.remove(group);
    },
    /** Pick it up, unless someone else has it. */
    grab: (key: string, spot: Spot) => {
      const owner = net?.ownerOf(key) ?? null;
      if ((owner !== null && owner !== net?.me) || theirs.has(key)) {
        return false;
      }
      air.delete(key);
      held = pickUp(underfoot(), key, shown.get(key), spot, performance.now());
      world.hold(key);
      net?.hold(key);
      net?.point(held.spot);
      return true;
    },
    /** Where this player's mouse is on screen, for their own line; null once it leaves. */
    hand: (at: { x: number; y: number } | null) => {
      hand = at;
    },
    get holding() {
      return held?.key ?? null;
    },
    /** Let go: it flies on the way it was moving, and lands on the nearest road or sidewalk. */
    letGo: () => {
      if (!held) {
        return;
      }
      const { key } = held;
      const { from: spot, toward: target } = throwOf(held);
      held = null;
      // Land it once to learn where, then again to wait out the fall from there.
      const first = world.land(key, target.x, target.z, world.tick);
      const landed = first && world.land(key, target.x, target.z, landingTick(spot, first.pose));
      if (landed) {
        startFall(key, spot, landed.pose);
        net?.drop({ from: spot, key, state: landed.state });
      }
      net?.letGo(key);
    },
    /** Where this player's pointer is in the town, for everyone else. */
    point: (spot: Spot | null) => {
      net?.point(spot);
    },
    /** Send a line of chat. */
    say: (text: string) => {
      draft = null;
      said = { text, until: performance.now() + SHOW_MS };
      net?.say(text);
    },
    /** Opens the town to its cars, passers-by and visitors, or keeps them away while it's built. */
    setOpen: (next: boolean) => {
      openedAt = next ? performance.now() : null;
      group.visible = next;
    },
    setTheme: (theme: Theme) => actors.setTheme(theme),
    /** What this player is typing, or null once they stop. */
    type: (next: string | null) => {
      draft = next;
      net?.type(next);
    },
    /** Each frame: step the town to now, share it, and draw it. */
    update: (dtMs: number) => {
      net?.update(dtMs);
      const nowMs = now();
      const target = tickAt(nowMs);
      keepTime(target);
      // Hidden until the town has settled on the room's version of it.
      settled ||= !net || net.isHost || net.status === "offline" || performance.now() - born > 4000;
      const others = net?.remotes() ?? [];
      const hands = new Map<string, Spot>();
      for (const other of others) {
        if (other.at) {
          hands.set(other.id, other.at);
        }
      }
      drawMovers({
        alpha: clamp((nowMs - target * TICK_MS) / TICK_MS, 0, 1),
        dt: dtMs / 1000,
        hands,
        time: performance.now(),
      });
      actors.update(cars, walkers, visitors);
      speak(world.tick);
      point(others);
      overlay.end();
    },
  };
};

export type Life = ReturnType<typeof createLife>;
