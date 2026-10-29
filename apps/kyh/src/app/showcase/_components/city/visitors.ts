// People who come and go from the projects. Each steps out of one project's
// door with something nice to say about it, walks the sidewalks to another
// project nearby and goes in, and after a while comes out again. Stepped in
// the same fixed ticks as the rest of the town, each with its own random
// state, so every browser sees the same person leave the same door.
import type { Graph, Pose } from "./traffic";
import type { Block, Rect } from "./plan";
import { advance, drawOf } from "@/lib/random";
import { cornerId, moverSeed, nearestEdge, routeTo, TICK } from "./traffic";

/** A project's front door, and the stretch of sidewalk it opens onto. */
export interface Door {
  slug: string;
  /** Where people step out: the middle of the building's front wall. */
  x: number;
  z: number;
  /** The sidewalk in front, one way and the other, and where the door's path meets it. */
  edge: number;
  back: number;
  /** How far along `edge` the path meets it. */
  s: number;
}

type Side = "north" | "east" | "south" | "west";

/** Which of a lot's sides faces the street: the nearest one, the camera's sides first. */
const frontOf = (lot: Rect, block: Rect): Side => {
  const gaps: [Side, number][] = [
    ["south", block.z + block.d - (lot.z + lot.d)],
    ["east", block.x + block.w - (lot.x + lot.w)],
    // The far sides face away from the camera: a door there is seen only when it's the only way out.
    ["north", lot.z - block.z + 0.6],
    ["west", lot.x - block.x + 0.6],
  ];
  let best = gaps[0] ?? ["south", 0];
  for (const gap of gaps) {
    if (gap[1] < best[1]) {
      best = gap;
    }
  }
  return best[0];
};

const SIDE_CORNERS = {
  east: ["ne", "se"],
  north: ["nw", "ne"],
  south: ["sw", "se"],
  west: ["nw", "sw"],
} as const;

/** The middle of a building's wall on each side. */
const WALL_MIDDLE: Record<Side, (wall: Rect) => { x: number; z: number }> = {
  east: (wall) => ({ x: wall.x + wall.w, z: wall.z + wall.d / 2 }),
  north: (wall) => ({ x: wall.x + wall.w / 2, z: wall.z }),
  south: (wall) => ({ x: wall.x + wall.w / 2, z: wall.z + wall.d }),
  west: (wall) => ({ x: wall.x, z: wall.z + wall.d / 2 }),
};

const edgeBetween = (graph: Graph, from: number, to: number) =>
  (graph.out[from] ?? []).find((edge) => graph.edges[edge]?.to === to);

/** Each project in a block gets a door onto the sidewalk in front of it. */
export const doorsOf = (
  graph: Graph,
  blocks: readonly Block[],
  buildings: readonly { slug: string; lot: Rect; wall: Rect }[],
): Door[] => {
  const doors: Door[] = [];
  for (const { slug, lot, wall } of buildings) {
    const block = blocks.find(
      (each) =>
        lot.x >= each.x - 1e-6 &&
        lot.z >= each.z - 1e-6 &&
        lot.x + lot.w <= each.x + each.w + 1e-6 &&
        lot.z + lot.d <= each.z + each.d + 1e-6,
    );
    if (block) {
      const side = frontOf(lot, block);
      const [a, b] = SIDE_CORNERS[side];
      const from = graph.ids.get(cornerId(block.bx, block.bz, a));
      const to = graph.ids.get(cornerId(block.bx, block.bz, b));
      const edge =
        from === undefined || to === undefined ? undefined : edgeBetween(graph, from, to);
      const back =
        from === undefined || to === undefined ? undefined : edgeBetween(graph, to, from);
      const run = edge === undefined ? undefined : graph.edges[edge];
      if (edge !== undefined && back !== undefined && run) {
        const { x, z } = WALL_MIDDLE[side](wall);
        const along = run.dx === 0 ? z - run.az : x - run.ax;
        doors.push({
          back,
          edge,
          s: Math.min(run.length - 0.05, Math.max(0.05, along)),
          slug,
          x,
          z,
        });
      }
    }
  }
  return doors;
};

/** Inside a building, stepping out, walking the sidewalks, or going in. */
export const INSIDE = 0;
export const LEAVING = 1;
const WALKING = 2;
export const ENTERING = 3;

export interface Visitor {
  mode: number;
  /** The door they last came out of (or are inside of). */
  door: number;
  /** The door they're headed for. */
  target: number;
  /** On the sidewalk: which edge and how far along; on a door path: how far along it. */
  edge: number;
  s: number;
  rng: number;
  /** Inside: the tick they come out. Set down by someone: the tick they walk on. */
  wait: number;
  /** The tick they said their line, and which line. */
  said: number;
  quote: number;
  speed: number;
  phase: number;
  pose: Pose;
  last: Pose;
}

/** How long a visitor's line stays up, in ticks. */
export const SAYING = Math.round(4 / TICK);

export const createVisitors = (
  graph: Graph,
  doors: readonly Door[],
  count: number,
  start: number,
  seed = 13,
) => {
  const routes = new Map<number, ReturnType<typeof routeTo>>();
  const route = (node: number) => {
    let known = routes.get(node);
    if (!known) {
      known = routeTo(graph, node);
      routes.set(node, known);
    }
    return known;
  };
  /** The sidewalk node a door's stretch starts and ends at. */
  const endsOf = (door: Door) =>
    [graph.edges[door.edge]?.from ?? 0, graph.edges[door.edge]?.to ?? 0] as const;
  /** Hops from `node` to the stretch in front of `door`. */
  const hopsTo = (node: number, door: Door) =>
    Math.min(...endsOf(door).map((end) => route(end).hops[node] ?? Infinity));
  // Each door's neighbors, nearest first, for picking somewhere close to go.
  const nearby = doors.map((door, index) =>
    doors
      .map((other, otherIndex) => ({
        distance: Math.hypot(other.x - door.x, other.z - door.z),
        otherIndex,
      }))
      .filter(({ otherIndex }) => otherIndex !== index)
      .toSorted((a, b) => a.distance - b.distance)
      .slice(0, 5)
      .map(({ otherIndex }) => otherIndex),
  );
  const pathOf = (door: Door) => {
    const edge = graph.edges[door.edge];
    const x = edge ? edge.ax + edge.dx * door.s : door.x;
    const z = edge ? edge.az + edge.dz * door.s : door.z;
    return { length: Math.abs(x - door.x) + Math.abs(z - door.z), x, z };
  };

  const pickTarget = (visitor: Visitor) => {
    const options = nearby[visitor.door] ?? [];
    visitor.rng = advance(visitor.rng);
    visitor.target = options[Math.floor(drawOf(visitor.rng) * options.length)] ?? visitor.door;
  };

  const place = (visitor: Visitor, settle: boolean) => {
    const door = doors[visitor.mode === ENTERING ? visitor.target : visitor.door];
    if (visitor.mode === LEAVING || visitor.mode === ENTERING || visitor.mode === INSIDE) {
      if (door) {
        const path = pathOf(door);
        // Leaving runs door → sidewalk; entering, sidewalk → door.
        const t = path.length > 0 ? Math.min(1, visitor.s / path.length) : 1;
        const k = visitor.mode === ENTERING ? 1 - t : t;
        visitor.pose.x = door.x + (path.x - door.x) * k;
        visitor.pose.z = door.z + (path.z - door.z) * k;
        const toward = visitor.mode === ENTERING ? -1 : 1;
        visitor.pose.heading = Math.atan2((path.z - door.z) * toward, (path.x - door.x) * toward);
      }
    } else {
      const edge = graph.edges[visitor.edge];
      if (edge) {
        visitor.pose.x = edge.ax + edge.dx * visitor.s;
        visitor.pose.z = edge.az + edge.dz * visitor.s;
        visitor.pose.heading = Math.atan2(edge.dz, edge.dx);
      }
    }
    if (settle) {
      visitor.last = { ...visitor.pose };
    }
  };

  /** Out on the sidewalk in front of their door: off whichever way is shorter. */
  const ontoSidewalk = (visitor: Visitor) => {
    const door = doors[visitor.door];
    const target = doors[visitor.target];
    if (!door || !target) {
      return;
    }
    const [a, b] = endsOf(door);
    const run = graph.edges[door.edge]?.length ?? 0;
    const viaEdge = hopsTo(b, target) + (run - door.s) / 7;
    const viaBack = hopsTo(a, target) + door.s / 7;
    visitor.mode = WALKING;
    if (viaEdge <= viaBack) {
      visitor.edge = door.edge;
      visitor.s = door.s;
    } else {
      visitor.edge = door.back;
      visitor.s = run - door.s;
    }
  };

  /** At the end of an edge: the next one toward the target's stretch. */
  const nextEdge = (visitor: Visitor) => {
    const here = graph.edges[visitor.edge];
    const target = doors[visitor.target];
    if (!here || !target) {
      return visitor.edge;
    }
    const node = here.to;
    for (const leaving of graph.out[node] ?? []) {
      if (leaving === target.edge || leaving === target.back) {
        return leaving;
      }
    }
    let best = { hops: Infinity, via: visitor.edge };
    for (const end of endsOf(target)) {
      const { hops, via } = route(end);
      const away = hops[node] ?? Infinity;
      if (away < best.hops) {
        best = { hops: away, via: via[node] ?? visitor.edge };
      }
    }
    return best.via;
  };

  /** Whether a walker on `edge` at `s` has reached the target's door path. */
  const atDoor = (visitor: Visitor) => {
    const target = doors[visitor.target];
    if (!target) {
      return false;
    }
    if (visitor.edge === target.edge) {
      return visitor.s >= target.s;
    }
    const run = graph.edges[target.back]?.length ?? 0;
    return visitor.edge === target.back && visitor.s >= run - target.s;
  };

  const visitors: Visitor[] = Array.from({ length: doors.length > 1 ? count : 0 }, (_, index) => {
    let rng = advance(moverSeed(seed, index));
    const door = Math.floor(drawOf(rng) * doors.length);
    rng = advance(rng);
    // Staggered, so people trickle out rather than leave at once.
    const wait = start + Math.round((drawOf(rng) * 24) / TICK);
    rng = advance(rng);
    const visitor: Visitor = {
      door,
      edge: 0,
      last: { heading: 0, x: 0, z: 0 },
      mode: INSIDE,
      phase: drawOf(rng) * Math.PI * 2,
      pose: { heading: 0, x: 0, z: 0 },
      quote: 0,
      rng: advance(rng),
      s: 0,
      said: -SAYING,
      speed: 0.42 + drawOf(advance(rng)) * 0.16,
      target: door,
      wait,
    };
    place(visitor, true);
    return visitor;
  });

  const step = (visitor: Visitor, tick: number) => {
    visitor.last.x = visitor.pose.x;
    visitor.last.z = visitor.pose.z;
    visitor.last.heading = visitor.pose.heading;
    if (visitor.mode === INSIDE) {
      if (tick >= visitor.wait) {
        // Out the door, with something to say about where they've been.
        visitor.mode = LEAVING;
        visitor.s = 0;
        visitor.said = tick;
        visitor.rng = advance(visitor.rng);
        visitor.quote = Math.floor(drawOf(visitor.rng) * 1_000_000);
        pickTarget(visitor);
        place(visitor, true);
      }
      return;
    }
    if (tick < visitor.wait) {
      return;
    }
    visitor.s += visitor.speed * TICK;
    visitor.phase += visitor.speed * TICK * 26;
    if (visitor.mode === LEAVING) {
      const door = doors[visitor.door];
      if (!door || visitor.s >= pathOf(door).length) {
        ontoSidewalk(visitor);
      }
    } else if (visitor.mode === WALKING) {
      if (atDoor(visitor)) {
        visitor.mode = ENTERING;
        visitor.s = 0;
      } else {
        const edge = graph.edges[visitor.edge];
        if (edge && visitor.s >= edge.length) {
          visitor.s -= edge.length;
          visitor.edge = nextEdge(visitor);
        }
      }
    } else {
      const target = doors[visitor.target];
      if (!target || visitor.s >= pathOf(target).length) {
        // In the door: they'll stay a while.
        visitor.mode = INSIDE;
        visitor.door = visitor.target;
        visitor.rng = advance(visitor.rng);
        visitor.wait = tick + Math.round((6 + drawOf(visitor.rng) * 10) / TICK);
      }
    }
    place(visitor, false);
  };

  return {
    landing: (visitor: Visitor, x: number, z: number, wait: number) => {
      const { edge, s } = nearestEdge(graph, x, z);
      Object.assign(visitor, { edge, mode: WALKING, s, wait });
      place(visitor, true);
    },
    pack: (visitor: Visitor) => [
      visitor.mode,
      visitor.door,
      visitor.target,
      visitor.edge,
      visitor.s,
      visitor.rng,
      visitor.wait,
      visitor.said,
      visitor.quote,
    ],
    step,
    unpack: (visitor: Visitor, values: readonly number[]) => {
      const [
        mode = INSIDE,
        door = 0,
        target = 0,
        edge = 0,
        s = 0,
        rng = 1,
        wait = 0,
        said = 0,
        quote = 0,
      ] = values;
      Object.assign(visitor, { door, edge, mode, quote, rng, s, said, target, wait });
      place(visitor, true);
    },
    visitors,
  };
};

export type Visitors = ReturnType<typeof createVisitors>;

/** How far from its door a visitor is full size, growing out of it or shrinking into it (cells). */
const DOORWAY = 0.3;

/** How big a visitor at `x, z` is drawn: full size, but shrinking into a door or growing out of one, never blinking. */
export const doorwaySize = (visitor: Visitor, doors: readonly Door[], x: number, z: number) => {
  const door = doors[visitor.mode === ENTERING ? visitor.target : visitor.door];
  if (!door || (visitor.mode !== LEAVING && visitor.mode !== ENTERING)) {
    return 1;
  }
  return Math.min(1, Math.hypot(x - door.x, z - door.z) / DOORWAY);
};
