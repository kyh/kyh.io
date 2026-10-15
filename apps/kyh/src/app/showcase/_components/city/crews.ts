// The machines that build the town on arrival, as a sim game's would: each
// turns up at a junction a couple of blocks off, drives the roads to the lane
// beside its site, works while the building goes up (a crane raises its mast
// and swings its jib; a truck waits by), then drives on and out the far side.
// Pure: where a crew is and what it's doing is a function of the build clock.
import type { Schedule, Site } from "./schedule";
import type { Graph } from "./traffic";
import { PACK_UP, RISE } from "./schedule";
import { createRandom } from "./random";
import { LANE, nearestEdge, routeTo } from "./traffic";

/** How many of the tallest buildings get a crane, and how many other sites a truck. */
const CRANES = 4;
const TRUCKS = 10;
/** How many blocks off a crew turns up, and drives off to. */
const HOPS = 2;
/** The latest a crew sets off for its site, before work starts there (s). */
const ARRIVE = 1;
/** How long a crane takes to raise or lower its mast (s). */
const MAST = 0.3;
/** How long a truck stays once it's dropped its load (s). */
const UNLOAD = 0.7;
/** How long a crew takes to appear at its junction, or vanish at the far one (s). */
const POP = 0.15;
/** How long the drive off takes (s). */
const LEAVE = Math.min(PACK_UP, 0.5);

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

export interface Crew {
  kind: "crane" | "truck";
  /** Where it parks to work: in the lane beside its site. */
  park: Point;
  /** In from a junction a couple of blocks off, and on out to another. */
  arrive: Route;
  leave: Route;
  /** How tall a crane's mast stands: over the top of what it builds. */
  mast: number;
  /**
   * Which way a crane's jib points (radians about y, from +x): at the
   * building it's raising, give or take a little so no two cranes line up.
   */
  aim: number;
  start: number;
  /** When its building's up and it packs up. */
  done: number;
}

export interface CrewPose {
  shown: boolean;
  x: number;
  z: number;
  /** Which way it faces, as a turn about y from nose-along -x (radians). */
  heading: number;
  /** How far a crane's mast is up, 0 to 1. */
  mast: number;
  /** Which way a crane's jib points, turned from its heading (radians). */
  jib: number;
  /** How far it's popped in, 0 to 1. */
  scale: number;
}

const HIDDEN: CrewPose = { heading: 0, jib: 0, mast: 0, scale: 0, shown: false, x: 0, z: 0 };

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

const crewFor = (graph: Graph, site: Site, kind: Crew["kind"], pick: number): Crew => {
  const random = createRandom(pick * 31 + 7);
  const top = site.top ?? 2;
  const near = nearestEdge(graph, site.x + site.w / 2, site.z + site.d / 2, LANE);
  const edge = graph.edges[near.edge];
  const park = edge
    ? {
        x: edge.ax + edge.dx * near.s - edge.dz * LANE,
        z: edge.az + edge.dz * near.s + edge.dx * LANE,
      }
    : { x: site.x + site.w + 0.35, z: site.z + site.d / 2 };
  const entry = edge ? junctionNear(graph, edge.from, pick) : -1;
  const exit = edge ? junctionNear(graph, edge.to, pick + 1, entry) : -1;
  const arrive = edge ? [...walk(graph, routeTo(graph, edge.from).via, entry), park] : [park];
  const leave = edge ? [park, ...walk(graph, routeTo(graph, exit).via, edge.to)] : [park];
  const cx = site.x + site.w / 2;
  const cz = site.z + site.d / 2;
  return {
    aim: Math.atan2(-(cz - park.z), cx - park.x) + random.range(-0.45, 0.45),
    arrive: routeOf(arrive),
    done: kind === "crane" ? site.start + top / RISE : site.start + UNLOAD,
    kind,
    leave: routeOf(leave),
    mast: top + 1,
    park,
    start: site.start,
  };
};

/** Cranes for the tallest buildings, trucks spread over the other sites in the order they go up. */
export const planCrews = (schedule: Pick<Schedule, "sites">, graph: Graph): Crew[] => {
  const tallest = schedule.sites
    .filter((site) => site.top !== null)
    .toSorted((a, b) => (b.top ?? 0) - (a.top ?? 0))
    .slice(0, CRANES);
  const rest = schedule.sites.filter((site) => !tallest.includes(site));
  const every = Math.max(1, Math.floor(rest.length / TRUCKS));
  const trucks = rest.filter((_, index) => index % every === 0).slice(0, TRUCKS);
  return [
    ...tallest.map((site, index) => crewFor(graph, site, "crane", index)),
    ...trucks.map((site, index) => crewFor(graph, site, "truck", index + CRANES)),
  ];
};

/** Where a crew is and what it's doing at `t` on the build clock. */
export const crewPose = (crew: Crew, t: number): CrewPose => {
  const setOff = crew.start - Math.min(ARRIVE, crew.start);
  const packed = crew.kind === "crane" ? crew.done + MAST : crew.done;
  const gone = packed + LEAVE;
  if (t < setOff || t > gone) {
    return HIDDEN;
  }
  const mast =
    crew.kind === "crane"
      ? Math.min(clamp01((t - (crew.start - MAST)) / MAST), 1 - clamp01((t - crew.done) / MAST))
      : 0;
  const scale = Math.min(clamp01((t - setOff) / POP), clamp01((gone - t) / POP));
  const swing = Math.sin((t - crew.start) * 1.4 + crew.aim * 3) * 0.25;
  let place = along(crew.arrive, crew.arrive.length);
  if (t < crew.start) {
    const k = easeInOut(clamp01((t - setOff) / (crew.start - setOff - 0.05)));
    place = along(crew.arrive, crew.arrive.length * k);
  } else if (t > packed) {
    place = along(crew.leave, crew.leave.length * easeInOut(clamp01((t - packed) / LEAVE)));
  }
  return {
    heading: place.heading,
    jib: crew.aim + swing - place.heading,
    mast,
    scale,
    shown: true,
    x: place.x,
    z: place.z,
  };
};
