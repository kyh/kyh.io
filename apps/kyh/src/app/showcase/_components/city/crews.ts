// The building sites that put the town up on arrival, as a sim game's would.
// A site is fenced off with its materials stacked in a corner; tower cranes
// go up beside it, a section at a time, before work starts, aim their jibs at
// the building while it rises inside its scaffolding, and come down once it's
// done. Trucks (dump trucks, cement mixers) come and go by road all the
// while: each turns up at a junction a couple of blocks off, takes the
// shortest roads to its own spot in the lane by the site, unloads and drives
// on out. Pure: everything is a function of the build clock.
import type { Rect } from "./plan";
import type { Schedule, Site } from "./schedule";
import type { Graph } from "./traffic";
import { createRandom } from "@/lib/random";
import { RISE } from "./schedule";
import { edgePoint, LANE, nearestEdge, pathTo, routeTo } from "./traffic";
import { clamp01, easeInOut, shownBetween } from "./ease";

/** How tall a building has to be to get one crane, and two. */
const ONE_CRANE = 2.5;
const TWO_CRANES = 5;
/** How tall a building has to be to go up inside scaffolding. */
const SCAFFOLDED = 1.2;
/** The odds of a project's site getting one, two or three trucks; a street's block gets one half the time. */
const LOT_TRUCKS = [0.55, 0.3, 0.15] as const;
const BLOCK_TRUCK = 0.5;
/** How long a truck may wait to set off, so it never meets another on the road (s). */
const MOST_WAIT = 2.5;
const WAIT_STEP = 0.25;
/** How many other ways in and out a truck may try before waiting. */
const DETOURS = 3;
/** How many blocks off a truck turns up, and drives off to. */
const HOPS = 2;
/** How fast a truck drives (cells a second), and the shortest and longest a drive takes (s). */
const SPEED = 6;
const SHORTEST_DRIVE = 0.8;
const LONGEST_DRIVE = 2.4;
/** How far apart trucks park nose to tail in a lane, in cells: a truck's length and a gap. */
const SPACING = 1.35;
/** How long a truck stays to unload, and how far apart a site's trucks arrive (s). */
const UNLOAD = 0.5;
const STAGGER = 0.35;
/** How long a site takes to be fenced off before work starts, and to be cleared after (s). */
const SETUP = 0.6;
const CLEAR = 0.3;
/** How long a crane takes to go up, and to come down (s). */
const ERECT = 0.5;
/** How long a truck or yard takes to appear, or vanish (s). */
const POP = 0.15;

interface Point {
  x: number;
  z: number;
}

/** A way along the roads: its corners, and how far along each one is. */
interface Route {
  points: Point[];
  at: number[];
  length: number;
}

/** A fenced site with its materials stacked by: there from setup until it's cleared. */
export interface Yard extends Rect {
  from: number;
  until: number;
}

/** Scaffolding round a building, as tall as it'll be; it rises as the building does. */
export interface Scaffold extends Rect {
  top: number;
  until: number;
}

export interface Crane {
  at: Point;
  /** How tall its mast stands: over the top of what it builds. */
  mast: number;
  /** Which way its jib points (radians about y, from +x): at its building, give or take. */
  aim: number;
  start: number;
  done: number;
}

export interface Truck {
  kind: "dump" | "mixer";
  arrive: Route;
  leave: Route;
  /** When it reaches its spot, and when it sets off again. */
  parked: number;
  leaves: number;
  /** How long its drives in and out take (s). */
  driveIn: number;
  driveOut: number;
}

export interface Works {
  yards: Yard[];
  scaffolds: Scaffold[];
  cranes: Crane[];
  trucks: Truck[];
  /** When the last of it has gone (s). */
  end: number;
}

export interface CranePose {
  shown: boolean;
  /** How much of the mast is up, 0 to 1, in whole sections. */
  mast: number;
  /** How far the jib has grown out from the top of the mast, 0 to 1. */
  reach: number;
  /** Which way the jib points (radians about y, from +x). */
  jib: number;
}

export interface TruckPose {
  shown: boolean;
  x: number;
  z: number;
  /** Which way it faces, as a turn about y from nose-along -x (radians). */
  heading: number;
  /** How far it's popped in, 0 to 1. */
  scale: number;
}

const routeOf = (points: Point[]): Route => {
  const at = [0];
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1];
    const b = points[index];
    at.push((at.at(-1) ?? 0) + (a && b ? Math.hypot(b.x - a.x, b.z - a.z) : 0));
  }
  return { at, length: at.at(-1) ?? 0, points };
};

/** Where along a route, `s` from its start, and which way it's heading there. */
const along = (route: Route, s: number) => {
  let index = 1;
  while (index < route.points.length - 1 && (route.at[index] ?? 0) < s) {
    index += 1;
  }
  const a = route.points[index - 1] ?? { x: 0, z: 0 };
  const b = route.points[index] ?? a;
  const from = route.at[index - 1] ?? 0;
  const span = (route.at[index] ?? from) - from;
  const k = span > 0 ? clamp01((s - from) / span) : 1;
  return {
    heading: Math.atan2(b.z - a.z, -(b.x - a.x)),
    x: a.x + (b.x - a.x) * k,
    z: a.z + (b.z - a.z) * k,
  };
};

/** A junction `HOPS` blocks from `node`, the `pick`th of those there are, other than `avoid`. */
const junctionNear = (graph: Graph, node: number, pick: number, avoid = -1) => {
  const { hops } = routeTo(graph, node);
  const ring = hops.flatMap((hop, index) => (hop === HOPS && index !== avoid ? [index] : []));
  return ring.length > 0 ? (ring[pick % ring.length] ?? node) : node;
};

const driveTime = (route: Route) =>
  Math.min(LONGEST_DRIVE, Math.max(SHORTEST_DRIVE, route.length / SPEED));

/**
 * Parking along the town's lanes: each truck its own spot, nose to tail
 * behind any already there, on the far side of the road once a lane's full.
 */
const createParking = (graph: Graph) => {
  const taken = new Map<number, number[]>();
  const reverseOf = (index: number) => {
    const edge = graph.edges[index];
    return graph.edges.findIndex((other) => other.from === edge?.to && other.to === edge.from);
  };
  /** A free spot as near `wanted` along edge `index` as there is, or on its reverse. */
  return (index: number, wanted: number) => {
    for (const [lane, near] of [
      [index, wanted],
      [reverseOf(index), (graph.edges[index]?.length ?? 0) - wanted],
    ] as const) {
      const edge = graph.edges[lane];
      const used = taken.get(lane) ?? [];
      if (edge) {
        const tries = Math.ceil(edge.length / SPACING) * 2 + 1;
        for (let step = 0; step < tries; step += 1) {
          const s = near + (step % 2 === 0 ? 1 : -1) * Math.ceil(step / 2) * SPACING;
          const free = used.every((other) => Math.abs(other - s) >= SPACING);
          if (s >= 0.5 && s <= edge.length - 0.5 && free) {
            taken.set(lane, [...used, s]);
            return { edge: lane, s };
          }
        }
      }
    }
    return { edge: index, s: wanted };
  };
};

/** A truck at `t`: driving in, parked, or driving off. */
export const truckPose = (truck: Truck, t: number): TruckPose => {
  const setOff = truck.parked - truck.driveIn;
  const gone = truck.leaves + truck.driveOut;
  if (t < setOff || t > gone) {
    return { heading: 0, scale: 0, shown: false, x: 0, z: 0 };
  }
  let place = along(truck.arrive, truck.arrive.length);
  if (t < truck.parked) {
    place = along(
      truck.arrive,
      truck.arrive.length * easeInOut(clamp01((t - setOff) / truck.driveIn)),
    );
  } else if (t > truck.leaves) {
    place = along(
      truck.leave,
      truck.leave.length * easeInOut(clamp01((t - truck.leaves) / truck.driveOut)),
    );
  }
  const scale = shownBetween(t, setOff, gone, POP);
  return { heading: place.heading, scale, shown: true, x: place.x, z: place.z };
};

/** How often a truck's way is checked against the others' (s); a wait is a whole number of these. */
const STEP = 0.05;
const WAIT_STEPS = Math.round(WAIT_STEP / STEP);

/** A truck's whole trip, sampled every STEP on a clock all trucks share, and the ground it covers. */
interface Track {
  /** The clock step of its first sample. */
  first: number;
  /** Where it is, and which way its nose points, at each step. */
  at: { x: number; z: number; nx: number; nz: number }[];
  box: { minX: number; maxX: number; minZ: number; maxZ: number };
}

const trackOf = (truck: Truck): Track => {
  const first = Math.ceil((truck.parked - truck.driveIn) / STEP);
  const last = Math.floor((truck.leaves + truck.driveOut) / STEP);
  const at: Track["at"] = [];
  const box = { maxX: -Infinity, maxZ: -Infinity, minX: Infinity, minZ: Infinity };
  for (let step = first; step <= last; step += 1) {
    const pose = truckPose(truck, step * STEP);
    at.push({ nx: -Math.cos(pose.heading), nz: Math.sin(pose.heading), x: pose.x, z: pose.z });
    box.minX = Math.min(box.minX, pose.x);
    box.maxX = Math.max(box.maxX, pose.x);
    box.minZ = Math.min(box.minZ, pose.z);
    box.maxZ = Math.max(box.maxZ, pose.z);
  }
  return { at, box, first };
};

/**
 * Whether a track, `shift` steps later, ever meets another: in one lane,
 * nearer than a truck's length; across a junction, nearer than half of one.
 * Passing in opposite lanes is fine.
 */
const meets = (a: Track, shift: number, b: Track) => {
  if (
    a.box.maxX + SPACING < b.box.minX ||
    b.box.maxX + SPACING < a.box.minX ||
    a.box.maxZ + SPACING < b.box.minZ ||
    b.box.maxZ + SPACING < a.box.minZ
  ) {
    return false;
  }
  const start = a.first + shift;
  const from = Math.max(start, b.first);
  const until = Math.min(start + a.at.length, b.first + b.at.length);
  for (let step = from; step < until; step += 1) {
    const p = a.at[step - start];
    const q = b.at[step - b.first];
    if (p && q) {
      const dx = q.x - p.x;
      const dz = q.z - p.z;
      const ahead = Math.abs(dx * p.nx + dz * p.nz);
      const aside = Math.abs(dx * p.nz - dz * p.nx);
      const parallel = Math.abs(p.nx * q.nx + p.nz * q.nz) > 0.7;
      if (
        (parallel && aside < 0.3 && ahead < SPACING - 0.1) ||
        (!parallel && Math.hypot(dx, dz) < 0.7)
      ) {
        return true;
      }
    }
  }
  return false;
};

/** How many trucks a site gets: few, mostly. */
const truckCount = (site: Site, pick: number) => {
  const roll = createRandom(pick * 53 + 11).next();
  if (site.kind === "block") {
    return roll < BLOCK_TRUCK ? 1 : 0;
  }
  const [one, two] = LOT_TRUCKS;
  if (roll < one) {
    return 1;
  }
  return roll < one + two ? 2 : 3;
};

/**
 * The trucks that serve a site, one after another, each to its own spot in a
 * lane beside it, by a way in and out (and a time) that meets no truck already
 * on the road, whose trips are `busy`; one that can't find one stays away.
 */
const trucksFor = (
  graph: Graph,
  park: ReturnType<typeof createParking>,
  site: Site,
  pick: number,
  busy: Track[],
): Truck[] => {
  const near = nearestEdge(graph, site.x + site.w / 2, site.z + site.d / 2, LANE);
  const trucks: Truck[] = [];
  for (let index = 0; index < truckCount(site, pick); index += 1) {
    const spot = park(near.edge, near.s);
    const edge = graph.edges[spot.edge];
    if (!edge) {
      continue;
    }
    const at = edgePoint(edge, spot.s, LANE);
    const due = site.start - 0.25 + index * STAGGER;
    const kind = (pick + index) % 3 === 1 ? "mixer" : "dump";
    // Each way is tried as it is, then later and later: a wait slides its track along the clock.
    const candidates = Array.from({ length: DETOURS }, (_, detour): Truck => {
      const way = pick * 3 + index + detour * 5;
      const entry = junctionNear(graph, edge.from, way);
      const exit = junctionNear(graph, edge.to, way + 1, entry);
      const arrive = routeOf([...pathTo(graph, entry, edge.from), at]);
      const leave = routeOf([at, ...pathTo(graph, edge.to, exit)]);
      return {
        arrive,
        driveIn: driveTime(arrive),
        driveOut: driveTime(leave),
        kind,
        leave,
        leaves: due + UNLOAD,
        parked: due,
      };
    }).map((truck) => ({ track: trackOf(truck), truck }));
    const waits = Array.from({ length: Math.floor(MOST_WAIT / WAIT_STEP) + 1 }, (_, n) => n);
    const clear = waits
      .flatMap((n) => candidates.map((candidate) => ({ ...candidate, shift: n * WAIT_STEPS })))
      .find(({ track, shift }) => !busy.some((other) => meets(track, shift, other)));
    // A truck with no clear way never comes: better one fewer than two on top of each other.
    if (clear) {
      const wait = clear.shift * STEP;
      trucks.push({
        ...clear.truck,
        leaves: clear.truck.leaves + wait,
        parked: clear.truck.parked + wait,
      });
      busy.push({ ...clear.track, first: clear.track.first + clear.shift });
    }
  }
  return trucks;
};

/** The cranes beside a building: one at a corner, a second at the opposite one for a tall one. */
const cranesFor = (site: Site, top: number, pick: number): Crane[] => {
  const random = createRandom(pick * 31 + 7);
  const corners = [
    { x: site.x - 0.35, z: site.z - 0.35 },
    { x: site.x + site.w + 0.35, z: site.z + site.d + 0.35 },
  ];
  const cx = site.x + site.w / 2;
  const cz = site.z + site.d / 2;
  return corners.slice(0, top >= TWO_CRANES ? 2 : 1).map((at) => ({
    aim: Math.atan2(-(cz - at.z), cx - at.x) + random.range(-0.45, 0.45),
    at,
    done: site.start + top / RISE,
    mast: top + 0.35,
    start: site.start,
  }));
};

/** Everything that builds the town: trucks for every site; a yard, scaffolding and cranes for the projects' buildings. */
export const planWorks = (schedule: Pick<Schedule, "sites">, graph: Graph): Works => {
  const works: Works = { cranes: [], end: 0, scaffolds: [], trucks: [], yards: [] };
  const park = createParking(graph);
  const busy: Track[] = [];
  for (const [pick, site] of schedule.sites.entries()) {
    const top = site.top ?? 1;
    const done = site.start + top / RISE;
    works.trucks.push(...trucksFor(graph, park, site, pick, busy));
    if (site.kind === "lot") {
      const rect = { d: site.d, w: site.w, x: site.x, z: site.z };
      works.yards.push({ ...rect, from: site.start - SETUP, until: done + CLEAR });
      if (top >= SCAFFOLDED) {
        works.scaffolds.push({ ...rect, top, until: done + CLEAR });
      }
      if (top >= ONE_CRANE) {
        works.cranes.push(...cranesFor(site, top, pick));
      }
    }
  }
  works.end = Math.max(
    ...works.trucks.map((truck) => truck.leaves + truck.driveOut),
    ...works.cranes.map((crane) => crane.done + ERECT),
    ...works.yards.map((yard) => yard.until),
  );
  return works;
};

/** How far a site's yard is up at `t`, 0 to 1. */
export const yardShown = (yard: Yard, t: number) => shownBetween(t, yard.from, yard.until, POP);

/** A crane at `t`: going up a section at a time before work starts, working, coming down after. */
export const cranePose = (crane: Crane, t: number): CranePose => {
  const up = shownBetween(t, crane.start - ERECT, crane.done + ERECT, ERECT);
  if (up <= 0) {
    return { jib: 0, mast: 0, reach: 0, shown: false };
  }
  // The mast goes up first, a section at a time; then the jib grows out from its top.
  const sections = Math.max(3, Math.round(crane.mast / 0.6));
  const mast = Math.ceil(clamp01(up / 0.8) * sections) / sections;
  const swing = Math.sin((t - crane.start) * 1.4 + crane.aim * 3) * 0.25;
  return { jib: crane.aim + swing, mast, reach: clamp01(up * 5 - 4), shown: true };
};
