// The town's opening: when each building goes up. Every lot is a building
// site of its own, every block the rest of its street; they break ground one
// after another from downtown out, each rising a storey at a time at the same
// pace, so a tower takes longer than a cottage. Whatever stands on neither
// (the countryside, the shore) follows by its distance from the middle.
import type { CityPlan, Rect } from "./plan";
import { createRandom } from "./random";

/** Cells a building rises a second while it's going up. */
export const RISE = 4;
/** How long the first machines take to drive in before any ground is broken (s). */
export const LEAD = 0.7;
/** How long, from the first site to the last, the town takes to break ground (s). */
const GROUND_BROKEN = 1.4;
/** How long the last machines take to pack up and drive off once their building's up (s). */
export const PACK_UP = 0.8;
/** Things a hair outside their lot (eaves, signs) still belong to it. */
const MARGIN = 0.3;
const MIDDLE = 36;

/** A building site: a project's lot or the rest of a block; where, when work starts there, and how tall it gets. */
export interface Site extends Rect {
  kind: "lot" | "block";
  start: number;
  /** The site's tallest point, where it's known: the projects' buildings. */
  top: number | null;
}

export interface Schedule {
  /** When work starts on whatever stands at this point (s). */
  startAt: (x: number, z: number) => number;
  sites: readonly Site[];
  /** When the last of it is up (s). */
  end: number;
}

const contains = (rect: Rect, x: number, z: number, margin: number) =>
  x >= rect.x - margin &&
  x <= rect.x + rect.w + margin &&
  z >= rect.z - margin &&
  z <= rect.z + rect.d + margin;

const distanceToMiddle = (rect: Rect) =>
  Math.hypot(rect.x + rect.w / 2 - MIDDLE, rect.z + rect.d / 2 - MIDDLE);

/**
 * The schedule for a town: its lots and blocks, in order out from the middle
 * with a little shuffle, and `tops` (how tall each project's building is, by
 * slug) so the end waits for the tallest.
 */
export const createSchedule = (
  plan: Pick<CityPlan, "blocks" | "lots">,
  tops: ReadonlyMap<string, number>,
): Schedule => {
  const random = createRandom(23);
  const unordered: Omit<Site, "start">[] = [
    ...plan.lots.map((lot): Omit<Site, "start"> => ({
      d: lot.d,
      kind: "lot",
      top: tops.get(lot.slug) ?? null,
      w: lot.w,
      x: lot.x,
      z: lot.z,
    })),
    ...plan.blocks.map((block): Omit<Site, "start"> => ({
      d: block.d,
      kind: "block",
      top: null,
      w: block.w,
      x: block.x,
      z: block.z,
    })),
  ];
  const ordered = unordered
    .map((site) => ({ order: distanceToMiddle(site) + random.next() * 6, site }))
    .toSorted((a, b) => a.order - b.order);
  const step = ordered.length > 1 ? GROUND_BROKEN / (ordered.length - 1) : 0;
  const sites: Site[] = ordered.map(({ site }, index) => ({ ...site, start: LEAD + index * step }));
  // Lots stand inside blocks: look them up first, so a building keeps its own start.
  const lots = sites.filter((site) => site.kind === "lot");
  const blocks = sites.filter((site) => site.kind === "block");
  const outskirts = (x: number, z: number) =>
    LEAD + Math.min(GROUND_BROKEN, Math.hypot(x - MIDDLE, z - MIDDLE) * 0.03);
  const tallest = Math.max(4, ...sites.map((site) => site.top ?? 0));
  return {
    end: LEAD + GROUND_BROKEN + tallest / RISE + PACK_UP,
    sites,
    startAt: (x, z) =>
      (
        lots.find((site) => contains(site, x, z, MARGIN)) ??
        blocks.find((site) => contains(site, x, z, 0))
      )?.start ?? outskirts(x, z),
  };
};
