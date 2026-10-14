// The town going about its day: cars driving the grid, turning at random
// at every junction, and people walking the sidewalks around the blocks and
// across at the zebra crossings. Pure state, stepped by the frame loop.
import type { CityPlan } from "./plan";
import type { Random } from "./random";
import { createRandom } from "./random";

export interface Pose {
  x: number;
  z: number;
  heading: number;
}

interface Edge {
  from: string;
  to: string;
  ax: number;
  az: number;
  dx: number;
  dz: number;
  length: number;
}

const makeEdge = (
  from: string,
  to: string,
  a: { x: number; z: number },
  b: { x: number; z: number },
): Edge => {
  const length = Math.hypot(b.x - a.x, b.z - a.z);
  return { ax: a.x, az: a.z, dx: (b.x - a.x) / length, dz: (b.z - a.z) / length, from, length, to };
};

const createGraph = () => {
  const out = new Map<string, Edge[]>();
  const link = (edge: Edge) => {
    const list = out.get(edge.from) ?? [];
    list.push(edge);
    out.set(edge.from, list);
  };
  const next = (edge: Edge, random: Random, allowBack: number) => {
    const options = out.get(edge.to) ?? [];
    const forward = options.filter((option) => option.to !== edge.from);
    const pool = forward.length > 0 && !random.chance(allowBack) ? forward : options;
    return pool.length > 0 ? random.pick(pool) : edge;
  };
  return { edges: () => [...out.values()].flat(), link, next };
};

// Cars keep right, swing through junctions on a curve and pick a new road.

const LANE = 0.21;
const TURN = 0.5;

export interface Car {
  edge: Edge;
  next: Edge;
  s: number;
  speed: number;
  pose: Pose;
}

const lanePoint = (edge: Edge, s: number) => ({
  x: edge.ax + edge.dx * s - edge.dz * LANE,
  z: edge.az + edge.dz * s + edge.dx * LANE,
});

const curve = (a: number, control: number, b: number, t: number) =>
  (1 - t) * (1 - t) * a + 2 * (1 - t) * t * control + t * t * b;

const carPosition = (car: Car) => {
  const turnStart = car.edge.length - TURN;
  if (car.s < turnStart) {
    return lanePoint(car.edge, car.s);
  }
  const t = Math.min(1, (car.s - turnStart) / (TURN * 2));
  const p0 = lanePoint(car.edge, turnStart);
  const p2 = lanePoint(car.next, TURN);
  const straight = Math.abs(car.edge.dx * car.next.dx + car.edge.dz * car.next.dz) > 0.5;
  const control = straight
    ? { x: (p0.x + p2.x) / 2, z: (p0.z + p2.z) / 2 }
    : { x: car.edge.dx === 0 ? p0.x : p2.x, z: car.edge.dz === 0 ? p0.z : p2.z };
  return { x: curve(p0.x, control.x, p2.x, t), z: curve(p0.z, control.z, p2.z, t) };
};

export const createTraffic = (plan: CityPlan, count: number, seed = 5) => {
  const random = createRandom(seed);
  const graph = createGraph();
  const junctions = new Map(plan.junctions.map((junction) => [junction.id, junction]));
  for (const road of plan.roads) {
    const a = junctions.get(road.from);
    const b = junctions.get(road.to);
    if (a && b) {
      graph.link(makeEdge(road.from, road.to, a, b));
      graph.link(makeEdge(road.to, road.from, b, a));
    }
  }
  const edges = graph.edges();
  const cars: Car[] =
    edges.length === 0
      ? []
      : Array.from({ length: count }, () => {
          const edge = random.pick(edges);
          const s = random.range(TURN, edge.length - TURN);
          const point = lanePoint(edge, s);
          return {
            edge,
            next: graph.next(edge, random, 0),
            pose: { heading: Math.atan2(edge.dz, edge.dx), x: point.x, z: point.z },
            s,
            speed: random.range(0.9, 1.6),
          };
        });
  const step = (dt: number) => {
    for (const car of cars) {
      car.s += car.speed * dt;
      if (car.s >= car.edge.length + TURN) {
        car.s -= car.edge.length;
        car.edge = car.next;
        car.next = graph.next(car.edge, random, 0.02);
      }
      const point = carPosition(car);
      const moved = Math.hypot(point.x - car.pose.x, point.z - car.pose.z);
      if (moved > 1e-5) {
        car.pose.heading = Math.atan2(point.z - car.pose.z, point.x - car.pose.x);
      }
      car.pose.x = point.x;
      car.pose.z = point.z;
    }
  };
  return { cars, step };
};

// People: a random walk on the sidewalks, a corner at a time.

const SIDEWALK = 0.17;

export interface Walker {
  edge: Edge;
  s: number;
  speed: number;
  /** Each keeps a little to one side, so a crowd doesn't walk in single file. */
  offset: number;
  phase: number;
  pose: Pose;
}

const cornerId = (bx: number, bz: number, corner: string) => `${bx},${bz}:${corner}`;

const createSidewalks = (plan: CityPlan) => {
  const graph = createGraph();
  const points = new Map<string, { x: number; z: number }>();
  const byPosition = new Map(plan.blocks.map((block) => [`${block.bx},${block.bz}`, block]));
  const join = (a: string, b: string) => {
    const pa = points.get(a);
    const pb = points.get(b);
    if (pa && pb) {
      graph.link(makeEdge(a, b, pa, pb));
      graph.link(makeEdge(b, a, pb, pa));
    }
  };
  for (const block of plan.blocks) {
    const x0 = block.x + SIDEWALK;
    const z0 = block.z + SIDEWALK;
    const x1 = block.x + block.w - SIDEWALK;
    const z1 = block.z + block.d - SIDEWALK;
    points.set(cornerId(block.bx, block.bz, "nw"), { x: x0, z: z0 });
    points.set(cornerId(block.bx, block.bz, "ne"), { x: x1, z: z0 });
    points.set(cornerId(block.bx, block.bz, "se"), { x: x1, z: z1 });
    points.set(cornerId(block.bx, block.bz, "sw"), { x: x0, z: z1 });
  }
  for (const { bx, bz } of plan.blocks) {
    join(cornerId(bx, bz, "nw"), cornerId(bx, bz, "ne"));
    join(cornerId(bx, bz, "ne"), cornerId(bx, bz, "se"));
    join(cornerId(bx, bz, "se"), cornerId(bx, bz, "sw"));
    join(cornerId(bx, bz, "sw"), cornerId(bx, bz, "nw"));
    // Zebra crossings to the neighbors east and south.
    if (byPosition.has(`${bx + 1},${bz}`)) {
      join(cornerId(bx, bz, "ne"), cornerId(bx + 1, bz, "nw"));
      join(cornerId(bx, bz, "se"), cornerId(bx + 1, bz, "sw"));
    }
    if (byPosition.has(`${bx},${bz + 1}`)) {
      join(cornerId(bx, bz, "sw"), cornerId(bx, bz + 1, "nw"));
      join(cornerId(bx, bz, "se"), cornerId(bx, bz + 1, "ne"));
    }
  }
  return graph;
};

export const createCrowd = (plan: CityPlan, count: number, seed = 9) => {
  const random = createRandom(seed);
  const graph = createSidewalks(plan);
  const edges = graph.edges();
  const walkers: Walker[] =
    edges.length === 0
      ? []
      : Array.from({ length: count }, () => {
          const edge = random.pick(edges);
          const s = random.range(0, edge.length);
          return {
            edge,
            offset: random.range(-0.06, 0.06),
            phase: random.range(0, Math.PI * 2),
            pose: { heading: Math.atan2(edge.dz, edge.dx), x: edge.ax, z: edge.az },
            s,
            speed: random.range(0.22, 0.42),
          };
        });
  const step = (dt: number) => {
    for (const walker of walkers) {
      walker.s += walker.speed * dt;
      walker.phase += walker.speed * dt * 26;
      if (walker.s >= walker.edge.length) {
        walker.s -= walker.edge.length;
        walker.edge = graph.next(walker.edge, random, 0.05);
      }
      const { edge } = walker;
      walker.pose.x = edge.ax + edge.dx * walker.s - edge.dz * walker.offset;
      walker.pose.z = edge.az + edge.dz * walker.s + edge.dx * walker.offset;
      walker.pose.heading = Math.atan2(edge.dz, edge.dx);
    }
  };
  return { step, walkers };
};
