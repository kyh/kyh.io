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
import { createRandom } from "./random";
import { RISE } from "./schedule";
import { LANE, nearestEdge, routeTo } from "./traffic";

/** How tall a building has to be to get one crane, and two. */
const ONE_CRANE = 2.5;
const TWO_CRANES = 5;
/** How tall a building has to be to go up inside scaffolding. */
const SCAFFOLDED = 1.2;
/** How many trucks a project's site and a street's block get. */
const LOT_TRUCKS = 3;
const BLOCK_TRUCKS = 1;
/** How many blocks off a truck turns up, and drives off to. */
const HOPS = 2;
/** How long a truck's drive in and out each take (s). */
const DRIVE = 0.7;
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
}

export interface Works {
  yards: Yard[];
  scaffolds: Scaffold[];
  cranes: Crane[];
  trucks: Truck[];
}

export interface CranePose {
  shown: boolean;
  /** How much of the mast is up, 0 to 1, in whole sections. */
  mast: number;
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

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

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

/** The nodes, by `via`, from `node` to wherever `via` leads. */
const walk = (graph: Graph, via: readonly number[], node: number) => {
  const nodes: Point[] = [];
  const seen = new Set<number>();
  let here = node;
  // A route never loops, but `seen` makes sure of it.
  while (!seen.has(here)) {
    seen.add(here);
    const spot = graph.nodes[here];
    if (spot) {
      nodes.push(spot);
    }
    const edge = graph.edges[via[here] ?? -1];
    if (!edge) {
      break;
    }
    here = edge.to;
  }
  return nodes;
};

/** A junction `HOPS` blocks from `node`, the `pick`th of those there are, other than `avoid`. */
const junctionNear = (graph: Graph, node: number, pick: number, avoid = -1) => {
  const { hops } = routeTo(graph, node);
  const ring = hops.flatMap((hop, index) => (hop === HOPS && index !== avoid ? [index] : []));
  return ring.length > 0 ? (ring[pick % ring.length] ?? node) : node;
};

/** The `count` trucks that serve a site, each to its own spot in the lane beside it, one after another. */
const trucksFor = (graph: Graph, site: Site, count: number, pick: number): Truck[] => {
  const near = nearestEdge(graph, site.x + site.w / 2, site.z + site.d / 2, LANE);
  const edge = graph.edges[near.edge];
  if (!edge) {
    return [];
  }
  return Array.from({ length: count }, (_, index): Truck => {
    const s = Math.min(edge.length - 0.3, Math.max(0.3, near.s + (index - (count - 1) / 2) * 0.8));
    const park = {
      x: edge.ax + edge.dx * s - edge.dz * LANE,
      z: edge.az + edge.dz * s + edge.dx * LANE,
    };
    const entry = junctionNear(graph, edge.from, pick + index);
    const exit = junctionNear(graph, edge.to, pick + index + 1, entry);
    const parked = Math.max(DRIVE, site.start - 0.25 + index * STAGGER);
    return {
      arrive: routeOf([...walk(graph, routeTo(graph, edge.from).via, entry), park]),
      kind: (pick + index) % 3 === 1 ? "mixer" : "dump",
      leave: routeOf([park, ...walk(graph, routeTo(graph, exit).via, edge.to)]),
      leaves: parked + UNLOAD,
      parked,
    };
  });
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
    mast: top + 1,
    start: site.start,
  }));
};

/** Everything that builds the town: trucks for every site; a yard, scaffolding and cranes for the projects' buildings. */
export const planWorks = (schedule: Pick<Schedule, "sites">, graph: Graph): Works => {
  const works: Works = { cranes: [], scaffolds: [], trucks: [], yards: [] };
  for (const [pick, site] of schedule.sites.entries()) {
    const top = site.top ?? 1;
    const done = site.start + top / RISE;
    works.trucks.push(
      ...trucksFor(graph, site, site.kind === "lot" ? LOT_TRUCKS : BLOCK_TRUCKS, pick * 3),
    );
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
  return works;
};

/** How far a site's yard is up at `t`, 0 to 1. */
export const yardShown = (yard: Yard, t: number) =>
  Math.min(clamp01((t - yard.from) / POP), clamp01((yard.until - t) / POP));

/** A crane at `t`: going up a section at a time before work starts, working, coming down after. */
export const cranePose = (crane: Crane, t: number): CranePose => {
  const up = Math.min(
    clamp01((t - (crane.start - ERECT)) / ERECT),
    1 - clamp01((t - crane.done) / ERECT),
  );
  if (up <= 0) {
    return { jib: 0, mast: 0, shown: false };
  }
  const sections = Math.max(3, Math.round(crane.mast / 0.6));
  const swing = Math.sin((t - crane.start) * 1.4 + crane.aim * 3) * 0.25;
  return { jib: crane.aim + swing, mast: Math.ceil(up * sections) / sections, shown: true };
};

/** A truck at `t`: driving in, parked, or driving off. */
export const truckPose = (truck: Truck, t: number): TruckPose => {
  const setOff = truck.parked - DRIVE;
  const gone = truck.leaves + DRIVE;
  if (t < setOff || t > gone) {
    return { heading: 0, scale: 0, shown: false, x: 0, z: 0 };
  }
  let place = along(truck.arrive, truck.arrive.length);
  if (t < truck.parked) {
    place = along(truck.arrive, truck.arrive.length * easeInOut(clamp01((t - setOff) / DRIVE)));
  } else if (t > truck.leaves) {
    place = along(truck.leave, truck.leave.length * easeInOut(clamp01((t - truck.leaves) / DRIVE)));
  }
  const scale = Math.min(clamp01((t - setOff) / POP), clamp01((gone - t) / POP));
  return { heading: place.heading, scale, shown: true, x: place.x, z: place.z };
};
