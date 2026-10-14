// The town going about its day: cars driving the grid, turning at random at
// every junction, and people walking the sidewalks round the blocks and
// across at the zebra crossings. Pure state, stepped in fixed ticks. Each car
// and walker carries its own random state, so a snapshot of them is the whole
// town, and any browser stepping it from there gets the same town.
import type { CityPlan } from "./plan";
import { advance, drawOf, seedOf } from "./random";

/** Seconds in one step of the town. */
export const TICK = 1 / 20;

export interface Pose {
  x: number;
  z: number;
  heading: number;
}

/** One way along a stretch of road or sidewalk, between two nodes. */
export interface Edge {
  from: number;
  to: number;
  ax: number;
  az: number;
  /** Unit direction: ±1 or 0 along each axis, since every stretch runs along x or z. */
  dx: number;
  dz: number;
  length: number;
}

export interface Graph {
  nodes: { x: number; z: number }[];
  edges: Edge[];
  /** The edges leaving each node, by index. */
  out: number[][];
  /** Node index by name. */
  ids: Map<string, number>;
}

const createGraph = (): Graph & {
  node: (id: string, x: number, z: number) => number;
  both: (a: number, b: number) => void;
} => {
  const graph: Graph = { edges: [], ids: new Map(), nodes: [], out: [] };
  const link = (a: number, b: number) => {
    const pa = graph.nodes[a];
    const pb = graph.nodes[b];
    if (!pa || !pb) {
      return;
    }
    const along = pa.x === pb.x || pa.z === pb.z;
    // Along an axis the length is a plain difference, the same on every machine.
    const length = along
      ? Math.abs(pb.x - pa.x) + Math.abs(pb.z - pa.z)
      : Math.hypot(pb.x - pa.x, pb.z - pa.z);
    if (length < 1e-9) {
      return;
    }
    graph.edges.push({
      ax: pa.x,
      az: pa.z,
      dx: (pb.x - pa.x) / length,
      dz: (pb.z - pa.z) / length,
      from: a,
      length,
      to: b,
    });
    graph.out[a]?.push(graph.edges.length - 1);
  };
  return {
    ...graph,
    both: (a, b) => {
      link(a, b);
      link(b, a);
    },
    node: (id, x, z) => {
      const known = graph.ids.get(id);
      if (known !== undefined) {
        return known;
      }
      graph.nodes.push({ x, z });
      graph.out.push([]);
      graph.ids.set(id, graph.nodes.length - 1);
      return graph.nodes.length - 1;
    },
  };
};

/** The roads, both ways, junction to junction. */
export const roadGraph = (plan: Pick<CityPlan, "junctions" | "roads">): Graph => {
  const graph = createGraph();
  for (const junction of plan.junctions) {
    graph.node(junction.id, junction.x, junction.z);
  }
  for (const road of plan.roads) {
    const a = graph.ids.get(road.from);
    const b = graph.ids.get(road.to);
    if (a !== undefined && b !== undefined) {
      graph.both(a, b);
    }
  }
  return graph;
};

/** How far in from a block's edge its sidewalk runs, in cells. */
export const SIDEWALK = 0.17;

export const cornerId = (bx: number, bz: number, corner: "nw" | "ne" | "se" | "sw") =>
  `${bx},${bz}:${corner}`;

/** The sidewalks: round every block, and over the crossings to its neighbors. */
export const sidewalkGraph = (plan: Pick<CityPlan, "blocks">): Graph => {
  const graph = createGraph();
  const blocks = new Set(plan.blocks.map((block) => `${block.bx},${block.bz}`));
  for (const block of plan.blocks) {
    const x0 = block.x + SIDEWALK;
    const z0 = block.z + SIDEWALK;
    const x1 = block.x + block.w - SIDEWALK;
    const z1 = block.z + block.d - SIDEWALK;
    graph.node(cornerId(block.bx, block.bz, "nw"), x0, z0);
    graph.node(cornerId(block.bx, block.bz, "ne"), x1, z0);
    graph.node(cornerId(block.bx, block.bz, "se"), x1, z1);
    graph.node(cornerId(block.bx, block.bz, "sw"), x0, z1);
  }
  const join = (a: string, b: string) => {
    const from = graph.ids.get(a);
    const to = graph.ids.get(b);
    if (from !== undefined && to !== undefined) {
      graph.both(from, to);
    }
  };
  for (const { bx, bz } of plan.blocks) {
    join(cornerId(bx, bz, "nw"), cornerId(bx, bz, "ne"));
    join(cornerId(bx, bz, "ne"), cornerId(bx, bz, "se"));
    join(cornerId(bx, bz, "se"), cornerId(bx, bz, "sw"));
    join(cornerId(bx, bz, "sw"), cornerId(bx, bz, "nw"));
    // Zebra crossings to the neighbors east and south.
    if (blocks.has(`${bx + 1},${bz}`)) {
      join(cornerId(bx, bz, "ne"), cornerId(bx + 1, bz, "nw"));
      join(cornerId(bx, bz, "se"), cornerId(bx + 1, bz, "sw"));
    }
    if (blocks.has(`${bx},${bz + 1}`)) {
      join(cornerId(bx, bz, "sw"), cornerId(bx, bz + 1, "nw"));
      join(cornerId(bx, bz, "se"), cornerId(bx, bz + 1, "ne"));
    }
  }
  return graph;
};

/**
 * Where to go from the end of `edge`: anywhere but straight back, mostly.
 * Draws from and returns the walker's or driver's own random state.
 */
export const turnAfter = (graph: Graph, edge: number, rng: number, uTurn: number) => {
  const here = graph.edges[edge];
  const options = here ? (graph.out[here.to] ?? []) : [];
  const forward = options.filter((option) => graph.edges[option]?.to !== here?.from);
  const back = advance(rng);
  const pick = advance(back);
  const pool = forward.length > 0 && drawOf(back) >= uTurn ? forward : options;
  return { edge: pool[Math.floor(drawOf(pick) * pool.length)] ?? edge, rng: pick };
};

/** The nearest point of any edge to (x, z), with each edge's point pushed sideways by `side`. */
export const nearestEdge = (graph: Graph, x: number, z: number, side = 0) => {
  let best = { distance: Infinity, edge: 0, s: 0 };
  for (const [index, edge] of graph.edges.entries()) {
    const s = Math.min(edge.length, Math.max(0, (x - edge.ax) * edge.dx + (z - edge.az) * edge.dz));
    const px = edge.ax + edge.dx * s - edge.dz * side;
    const pz = edge.az + edge.dz * s + edge.dx * side;
    const distance = (px - x) ** 2 + (pz - z) ** 2;
    if (distance < best.distance) {
      best = { distance, edge: index, s };
    }
  }
  return best;
};

/** Spreads one seed across many movers, each a state of its own. */
export const moverSeed = (seed: number, index: number) => seedOf(seed * 7919 + index * 104_729 + 1);

// Cars keep right, swing through junctions on a curve and pick a new road.

export const LANE = 0.21;
const TURN = 0.5;

export interface Car {
  edge: number;
  next: number;
  s: number;
  speed: number;
  rng: number;
  /** Set down by someone: it waits here until this tick before driving on. */
  wait: number;
  pose: Pose;
  /** Where it was a tick ago, to draw it between ticks. */
  last: Pose;
}

const lanePoint = (edge: Edge, s: number) => ({
  x: edge.ax + edge.dx * s - edge.dz * LANE,
  z: edge.az + edge.dz * s + edge.dx * LANE,
});

const curve = (a: number, control: number, b: number, t: number) =>
  (1 - t) * (1 - t) * a + 2 * (1 - t) * t * control + t * t * b;

const carPoint = (graph: Graph, car: Car) => {
  const edge = graph.edges[car.edge];
  const next = graph.edges[car.next];
  if (!edge || !next) {
    return { x: car.pose.x, z: car.pose.z };
  }
  const turnStart = edge.length - TURN;
  if (car.s < turnStart) {
    return lanePoint(edge, car.s);
  }
  const t = Math.min(1, (car.s - turnStart) / (TURN * 2));
  const p0 = lanePoint(edge, turnStart);
  const p2 = lanePoint(next, TURN);
  const straight = Math.abs(edge.dx * next.dx + edge.dz * next.dz) > 0.5;
  const control = straight
    ? { x: (p0.x + p2.x) / 2, z: (p0.z + p2.z) / 2 }
    : { x: edge.dx === 0 ? p0.x : p2.x, z: edge.dz === 0 ? p0.z : p2.z };
  return { x: curve(p0.x, control.x, p2.x, t), z: curve(p0.z, control.z, p2.z, t) };
};

/** Puts the car where its edge and distance say, facing along the road. */
const poseCar = (graph: Graph, car: Car, settle: boolean) => {
  const point = carPoint(graph, car);
  const moved = Math.hypot(point.x - car.pose.x, point.z - car.pose.z);
  if (settle) {
    const edge = graph.edges[car.edge];
    car.pose.heading = edge ? Math.atan2(edge.dz, edge.dx) : car.pose.heading;
  } else if (moved > 1e-5) {
    car.pose.heading = Math.atan2(point.z - car.pose.z, point.x - car.pose.x);
  }
  car.pose.x = point.x;
  car.pose.z = point.z;
  if (settle) {
    car.last = { ...car.pose };
  }
};

export const createTraffic = (graph: Graph, count: number, seed = 5) => {
  const cars: Car[] =
    graph.edges.length === 0
      ? []
      : Array.from({ length: count }, (_, index) => {
          let rng = advance(moverSeed(seed, index));
          const edge = Math.floor(drawOf(rng) * graph.edges.length);
          rng = advance(rng);
          const length = graph.edges[edge]?.length ?? 1;
          const s = TURN + drawOf(rng) * Math.max(0, length - TURN * 2);
          rng = advance(rng);
          const speed = 0.9 + drawOf(rng) * 0.7;
          const turn = turnAfter(graph, edge, rng, 0);
          const car: Car = {
            edge,
            last: { heading: 0, x: 0, z: 0 },
            next: turn.edge,
            pose: { heading: 0, x: 0, z: 0 },
            rng: turn.rng,
            s,
            speed,
            wait: 0,
          };
          poseCar(graph, car, true);
          return car;
        });
  /** One tick for one car: `tick` is the tick being stepped into. */
  const stepCar = (car: Car, tick: number) => {
    car.last.x = car.pose.x;
    car.last.z = car.pose.z;
    car.last.heading = car.pose.heading;
    if (tick < car.wait) {
      return;
    }
    car.s += car.speed * TICK;
    const edge = graph.edges[car.edge];
    if (edge && car.s >= edge.length + TURN) {
      car.s -= edge.length;
      car.edge = car.next;
      const turn = turnAfter(graph, car.edge, car.rng, 0.02);
      car.next = turn.edge;
      car.rng = turn.rng;
    }
    poseCar(graph, car, false);
  };
  /** Sets a car down on the lane nearest (x, z), to wait there until `wait`. */
  const landing = (car: Car, x: number, z: number, wait: number) => {
    const { edge, s } = nearestEdge(graph, x, z, LANE);
    const length = graph.edges[edge]?.length ?? 1;
    car.edge = edge;
    car.s = Math.min(Math.max(s, TURN), Math.max(TURN, length - TURN));
    const turn = turnAfter(graph, edge, car.rng, 0);
    car.next = turn.edge;
    car.rng = turn.rng;
    car.wait = wait;
    poseCar(graph, car, true);
  };
  return {
    cars,
    landing,
    pack: (car: Car) => [car.edge, car.next, car.s, car.rng, car.wait],
    stepCar,
    unpack: (car: Car, values: readonly number[]) => {
      const [edge = 0, next = 0, s = 0, rng = 1, wait = 0] = values;
      Object.assign(car, { edge, next, rng, s, wait });
      poseCar(graph, car, true);
    },
  };
};

export type Traffic = ReturnType<typeof createTraffic>;

// People: a random walk on the sidewalks, a corner at a time.

export interface Walker {
  edge: number;
  s: number;
  speed: number;
  /** Each keeps a little to one side, so a crowd doesn't walk in single file. */
  offset: number;
  phase: number;
  rng: number;
  wait: number;
  pose: Pose;
  last: Pose;
}

/** Puts a walker where its edge and distance say. */
export const poseWalker = (graph: Graph, walker: Walker, settle: boolean) => {
  const edge = graph.edges[walker.edge];
  if (!edge) {
    return;
  }
  walker.pose.x = edge.ax + edge.dx * walker.s - edge.dz * walker.offset;
  walker.pose.z = edge.az + edge.dz * walker.s + edge.dx * walker.offset;
  walker.pose.heading = Math.atan2(edge.dz, edge.dx);
  if (settle) {
    walker.last = { ...walker.pose };
  }
};

export const createCrowd = (graph: Graph, count: number, seed = 9) => {
  const walkers: Walker[] =
    graph.edges.length === 0
      ? []
      : Array.from({ length: count }, (_, index) => {
          let rng = advance(moverSeed(seed, index));
          const edge = Math.floor(drawOf(rng) * graph.edges.length);
          rng = advance(rng);
          const s = drawOf(rng) * (graph.edges[edge]?.length ?? 1);
          rng = advance(rng);
          const offset = -0.06 + drawOf(rng) * 0.12;
          rng = advance(rng);
          const phase = drawOf(rng) * Math.PI * 2;
          rng = advance(rng);
          const walker: Walker = {
            edge,
            last: { heading: 0, x: 0, z: 0 },
            offset,
            phase,
            pose: { heading: 0, x: 0, z: 0 },
            rng,
            s,
            speed: 0.22 + drawOf(rng) * 0.2,
            wait: 0,
          };
          poseWalker(graph, walker, true);
          return walker;
        });
  const stepWalker = (walker: Walker, tick: number) => {
    walker.last.x = walker.pose.x;
    walker.last.z = walker.pose.z;
    walker.last.heading = walker.pose.heading;
    if (tick < walker.wait) {
      return;
    }
    walker.s += walker.speed * TICK;
    walker.phase += walker.speed * TICK * 26;
    const edge = graph.edges[walker.edge];
    if (edge && walker.s >= edge.length) {
      walker.s -= edge.length;
      const turn = turnAfter(graph, walker.edge, walker.rng, 0.05);
      walker.edge = turn.edge;
      walker.rng = turn.rng;
    }
    poseWalker(graph, walker, false);
  };
  return {
    landing: (walker: Walker, x: number, z: number, wait: number) => {
      const { edge, s } = nearestEdge(graph, x, z);
      Object.assign(walker, { edge, s, wait });
      poseWalker(graph, walker, true);
    },
    pack: (walker: Walker) => [walker.edge, walker.s, walker.rng, walker.wait],
    stepWalker,
    unpack: (walker: Walker, values: readonly number[]) => {
      const [edge = 0, s = 0, rng = 1, wait = 0] = values;
      Object.assign(walker, { edge, rng, s, wait });
      poseWalker(graph, walker, true);
    },
    walkers,
  };
};

export type Crowd = ReturnType<typeof createCrowd>;
