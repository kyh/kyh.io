// The machines that build the town on arrival, as a sim game's would: each
// drives in to its site, works while the building goes up (a crane raises its
// mast and swings its jib; a truck waits by), then packs up and drives off.
// Pure: where a crew is and what it's doing is a function of the build clock.
import type { Schedule, Site } from "./schedule";
import { PACK_UP, RISE } from "./schedule";

/** How many of the tallest buildings get a crane, and how many other sites a truck. */
const CRANES = 4;
const TRUCKS = 10;
/** How far off a crew starts driving in from, and drives off to, in cells. */
const DRIVE = 6;
/** How long the drive in takes, finishing just before ground is broken (s). */
const ARRIVE = 0.6;
/** How long a crane takes to raise or lower its mast (s). */
const MAST = 0.3;
/** How long a truck stays once it's dropped its load (s). */
const UNLOAD = 0.7;

export interface Crew {
  kind: "crane" | "truck";
  /** Where it parks to work: beside its site. */
  park: { x: number; z: number };
  /** How tall a crane's mast stands: over the top of what it builds. */
  mast: number;
  start: number;
  /** When its building's up and it packs up. */
  done: number;
}

export interface CrewPose {
  shown: boolean;
  x: number;
  z: number;
  /** How far a crane's mast is up, 0 to 1. */
  mast: number;
  /** Which way a crane's jib points (radians). */
  jib: number;
}

const HIDDEN: CrewPose = { jib: 0, mast: 0, shown: false, x: 0, z: 0 };

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeIn = (t: number) => t ** 3;

const crewFor = (site: Site, kind: Crew["kind"]): Crew => {
  const top = site.top ?? 2;
  return {
    done: kind === "crane" ? site.start + top / RISE : site.start + UNLOAD,
    kind,
    mast: top + 1,
    park: { x: site.x + site.w + 0.35, z: site.z + site.d / 2 },
    start: site.start,
  };
};

/** Cranes for the tallest buildings, trucks spread over the other sites in the order they go up. */
export const planCrews = (schedule: Pick<Schedule, "sites">): Crew[] => {
  const tallest = schedule.sites
    .filter((site) => site.top !== null)
    .toSorted((a, b) => (b.top ?? 0) - (a.top ?? 0))
    .slice(0, CRANES);
  const rest = schedule.sites.filter((site) => !tallest.includes(site));
  const every = Math.max(1, Math.floor(rest.length / TRUCKS));
  const trucks = rest.filter((_, index) => index % every === 0).slice(0, TRUCKS);
  return [
    ...tallest.map((site) => crewFor(site, "crane")),
    ...trucks.map((site) => crewFor(site, "truck")),
  ];
};

/** Where a crew is and what it's doing at `t` on the build clock. */
export const crewPose = (crew: Crew, t: number): CrewPose => {
  const arrive = crew.start - ARRIVE - 0.1;
  const packed = crew.kind === "crane" ? crew.done + MAST : crew.done;
  const gone = packed + Math.min(PACK_UP, 0.5);
  if (t < arrive || t > gone) {
    return HIDDEN;
  }
  // In from one side, out the other, along x.
  const coming = easeOut(clamp01((t - arrive) / ARRIVE));
  const going = easeIn(clamp01((t - packed) / (gone - packed)));
  const x = crew.park.x + DRIVE * (1 - coming) - DRIVE * going;
  const mast =
    crew.kind === "crane"
      ? Math.min(clamp01((t - (crew.start - MAST)) / MAST), 1 - clamp01((t - crew.done) / MAST))
      : 0;
  return { jib: Math.sin((t - crew.start) * 1.4) * 1.1, mast, shown: true, x, z: crew.park.z };
};
