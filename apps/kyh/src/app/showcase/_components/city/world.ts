// Everything that moves on the ground, as one deterministic town: cars,
// passers-by, and visitors going in and out of the projects. It steps in
// fixed ticks, a snapshot of it is one short string, and whoever is holding
// a car or a person takes it out of the step until they set it down.
import type { CityPlan, Rect } from "./plan";
import type { Pose } from "./traffic";
import { createCrowd, createTraffic, roadGraph, sidewalkGraph, TICK } from "./traffic";
import { createVisitors, doorsOf } from "./visitors";

/** Bumped whenever the town steps or packs differently, so old and new pages never share a room. */
export const TOWN_VERSION = 1;

export const CARS = 48;
export const WALKERS = 180;
export const VISITORS = 40;

/** The tick a moment falls in, from milliseconds on a clock everyone shares. */
export const tickAt = (ms: number) => Math.floor(ms / (TICK * 1000));

export type ActorKind = "car" | "walker" | "visitor";

const PREFIX: Record<ActorKind, string> = { car: "c", visitor: "v", walker: "w" };
const KINDS: readonly ActorKind[] = ["car", "walker", "visitor"];

/** A car, walker or visitor by kind and number, as a key: "c12", "w40", "v3". */
export const actorKey = (kind: ActorKind, index: number) => `${PREFIX[kind]}${index}`;

export const parseActorKey = (key: string): { kind: ActorKind; index: number } | null => {
  const index = Number(key.slice(1));
  if (!Number.isInteger(index) || index < 0) {
    return null;
  }
  const kind = KINDS.find((each) => PREFIX[each] === key[0]);
  return kind ? { index, kind } : null;
};

const numbers = (part: string) => (part === "" ? [] : part.split(",").map(Number));

// What a mover's packed state may hold. Snapshots and drops come from other
// browsers in a public room, so nothing is taken on trust.
const isIndex = (value: number | undefined, size: number) =>
  Number.isInteger(value) && Number(value) >= 0 && Number(value) < size;
const isSeed = (value: number | undefined) =>
  Number.isInteger(value) && Number(value) >= 1 && Number(value) < 2_147_483_647;
const isTick = (value: number | undefined) => Number.isSafeInteger(value);
const isAlong = (value: number | undefined) =>
  Number.isFinite(value) && Number(value) > -1 && Number(value) < 64;

/** The ground world a plan and its project buildings make. */
export const createWorld = (
  plan: Pick<CityPlan, "blocks" | "junctions" | "roads">,
  buildings: readonly { slug: string; lot: Rect; wall: Rect }[],
  start: number,
) => {
  const sidewalks = sidewalkGraph(plan);
  const roads = roadGraph(plan);
  const traffic = createTraffic(roads, CARS);
  const crowd = createCrowd(sidewalks, WALKERS);
  const doors = doorsOf(sidewalks, plan.blocks, buildings);
  const visitors = createVisitors(sidewalks, doors, VISITORS, start);
  const held: Record<ActorKind, Set<number>> = {
    car: new Set(),
    visitor: new Set(),
    walker: new Set(),
  };
  let tick = start;

  const SIZES: Record<ActorKind, number> = { car: 5, visitor: 9, walker: 4 };
  const valid = (kind: ActorKind, values: readonly number[]) => {
    if (values.length !== SIZES[kind]) {
      return false;
    }
    if (kind === "car") {
      const [edge, next, s, rng, wait] = values;
      const size = roads.edges.length;
      return (
        isIndex(edge, size) && isIndex(next, size) && isAlong(s) && isSeed(rng) && isTick(wait)
      );
    }
    if (kind === "walker") {
      const [edge, s, rng, wait] = values;
      return isIndex(edge, sidewalks.edges.length) && isAlong(s) && isSeed(rng) && isTick(wait);
    }
    const [mode, door, target, edge, s, rng, wait, said, quote] = values;
    return (
      isIndex(mode, 4) &&
      isIndex(door, doors.length) &&
      isIndex(target, doors.length) &&
      isIndex(edge, sidewalks.edges.length) &&
      isAlong(s) &&
      isSeed(rng) &&
      isTick(wait) &&
      isTick(said) &&
      isIndex(quote, Number.MAX_SAFE_INTEGER)
    );
  };

  const step = () => {
    tick += 1;
    for (const [index, car] of traffic.cars.entries()) {
      if (!held.car.has(index)) {
        traffic.stepCar(car, tick);
      }
    }
    for (const [index, walker] of crowd.walkers.entries()) {
      if (!held.walker.has(index)) {
        crowd.stepWalker(walker, tick);
      }
    }
    for (const [index, visitor] of visitors.visitors.entries()) {
      if (!held.visitor.has(index)) {
        visitors.step(visitor, tick);
      }
    }
  };

  /** The mover a key names, with its kind's pack, unpack and landing. */
  const mover = (key: string) => {
    const parsed = parseActorKey(key);
    if (!parsed) {
      return null;
    }
    const { index, kind } = parsed;
    if (kind === "car") {
      const car = traffic.cars[index];
      return car
        ? {
            index,
            kind,
            land: (x: number, z: number, wait: number) => traffic.landing(car, x, z, wait),
            pack: () => traffic.pack(car),
            pose: car.pose,
            unpack: (values: readonly number[]) => traffic.unpack(car, values),
          }
        : null;
    }
    if (kind === "walker") {
      const walker = crowd.walkers[index];
      return walker
        ? {
            index,
            kind,
            land: (x: number, z: number, wait: number) => crowd.landing(walker, x, z, wait),
            pack: () => crowd.pack(walker),
            pose: walker.pose,
            unpack: (values: readonly number[]) => crowd.unpack(walker, values),
          }
        : null;
    }
    const visitor = visitors.visitors[index];
    return visitor
      ? {
          index,
          kind,
          land: (x: number, z: number, wait: number) => visitors.landing(visitor, x, z, wait),
          pack: () => visitors.pack(visitor),
          pose: visitor.pose,
          unpack: (values: readonly number[]) => visitors.unpack(visitor, values),
        }
      : null;
  };

  /**
   * Moves the town's clock without stepping it, every waiting tick with it: a
   * jump in time (a tab back from the background, the room's clock arriving)
   * picks up where things stood instead of replaying or freezing.
   */
  const shift = (delta: number) => {
    tick += delta;
    for (const car of traffic.cars) {
      car.wait += delta;
    }
    for (const walker of crowd.walkers) {
      walker.wait += delta;
    }
    for (const visitor of visitors.visitors) {
      visitor.wait += delta;
      visitor.said += delta;
    }
  };

  const heldKeys = () =>
    KINDS.flatMap((kind) => [...held[kind]].map((index) => actorKey(kind, index)));

  return {
    /** Steps to `target`, but never more than `limit` ticks: a longer gap is skipped. */
    advanceTo: (target: number, limit: number) => {
      if (target - tick > limit) {
        shift(target - limit - tick);
      }
      for (let left = target - tick; left > 0; left -= 1) {
        step();
      }
    },
    cars: traffic.cars,
    doors,
    /** Pick it up: it stops where it is until it's set down. */
    hold: (key: string) => {
      const parsed = parseActorKey(key);
      if (parsed) {
        held[parsed.kind].add(parsed.index);
      }
    },
    isHeld: (kind: ActorKind, index: number) => held[kind].has(index),
    /**
     * Set it down on the nearest lane or sidewalk to (x, z), to stay put until
     * tick `wait` (while it falls and bounces), and say where it went: the
     * state anyone else needs to set the same thing down in the same place.
     */
    land: (key: string, x: number, z: number, wait: number) => {
      const found = mover(key);
      if (!found) {
        return null;
      }
      held[found.kind].delete(found.index);
      found.land(x, z, wait);
      return { pose: { ...found.pose }, state: found.pack() };
    },
    /** The whole ground world as text, for a joiner to start from. */
    pack: () =>
      [
        tick,
        traffic.cars.flatMap((car) => traffic.pack(car)).join(","),
        crowd.walkers.flatMap((walker) => crowd.pack(walker)).join(","),
        visitors.visitors.flatMap((visitor) => visitors.pack(visitor)).join(","),
        // Held by someone as this was taken: a joiner hears where they land from the drop.
        heldKeys().join(","),
      ].join("|"),
    /** Someone else set it down: take their word for exactly where. */
    place: (key: string, state: readonly number[]) => {
      const found = mover(key);
      if (!found || !valid(found.kind, state)) {
        return null;
      }
      held[found.kind].delete(found.index);
      found.unpack(state);
      return { ...found.pose };
    },
    poseOf: (key: string): Pose | null => {
      const found = mover(key);
      return found ? found.pose : null;
    },
    /**
     * Starts over from a snapshot. Whatever is held, here or when the snapshot
     * was taken, and whatever `keep` names (things still falling), stays as
     * it is: the snapshot may be older than its landing.
     */
    restore: (text: string, keep: (key: string) => boolean = () => false) => {
      const [at, cars = "", walkers = "", people = "", holding = ""] = text.split("|");
      const heldThen = new Set(holding.split(","));
      const stays = (kind: ActorKind, index: number) =>
        held[kind].has(index) || heldThen.has(actorKey(kind, index)) || keep(actorKey(kind, index));
      const carValues = numbers(cars);
      const walkerValues = numbers(walkers);
      const visitorValues = numbers(people);
      const fits =
        Number.isSafeInteger(Number(at)) &&
        carValues.length === traffic.cars.length * 5 &&
        walkerValues.length === crowd.walkers.length * 4 &&
        visitorValues.length === visitors.visitors.length * 9 &&
        traffic.cars.every((_, index) => valid("car", carValues.slice(index * 5, index * 5 + 5))) &&
        crowd.walkers.every((_, index) =>
          valid("walker", walkerValues.slice(index * 4, index * 4 + 4)),
        ) &&
        visitors.visitors.every((_, index) =>
          valid("visitor", visitorValues.slice(index * 9, index * 9 + 9)),
        );
      if (!fits) {
        return false;
      }
      for (const [index, car] of traffic.cars.entries()) {
        if (!stays("car", index)) {
          traffic.unpack(car, carValues.slice(index * 5, index * 5 + 5));
        }
      }
      for (const [index, walker] of crowd.walkers.entries()) {
        if (!stays("walker", index)) {
          crowd.unpack(walker, walkerValues.slice(index * 4, index * 4 + 4));
        }
      }
      for (const [index, visitor] of visitors.visitors.entries()) {
        if (!stays("visitor", index)) {
          visitors.unpack(visitor, visitorValues.slice(index * 9, index * 9 + 9));
        }
      }
      tick = Number(at);
      return true;
    },
    shift,
    stateOf: (key: string) => mover(key)?.pack() ?? null,
    get tick() {
      return tick;
    },
    visitors: visitors.visitors,
    walkers: crowd.walkers,
  };
};

export type World = ReturnType<typeof createWorld>;
