// The town's opening: when each building goes up. Every lot is a building
// site of its own, every block the rest of its street; they break ground one
// after another from downtown out, each rising a storey at a time at the same
// pace, so a tower takes longer than a cottage. Whatever stands on neither
// (the countryside, the shore) follows by its distance from the middle.
import type { CityPlan, Rect } from "./plan";
import { CENTER, contains } from "./plan";
import { createRandom } from "@/lib/random";

/** Cells a building rises a second while it's going up. */
export const RISE = 4;
/** How long the first machines take to drive in before any ground is broken (s). */
export const LEAD = 1;
/** How long, from the first site to the last, the town takes to break ground (s). */
const GROUND_BROKEN = 1.4;
/** A beat after the last building's up before the town opens (s). */
const SETTLE = 0.8;
/** How tall to allow for the tallest building, should no project's height be known. */
const STREET_TOP = 4;
/** Things a hair outside their lot (eaves, signs) still belong to it. */
const MARGIN = 0.3;
/** The size of the grid sites are filed in, for finding the site at a point (cells). */
const CELL = 2;
const cellAt = (x: number, z: number) => [Math.floor(x / CELL), Math.floor(z / CELL)] as const;

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

const distanceToMiddle = (rect: Rect) =>
  Math.hypot(rect.x + rect.w / 2 - CENTER, rect.z + rect.d / 2 - CENTER);

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
  // Each site is filed under every grid cell it touches, so finding a point's
  // site checks a handful, not the town; lots stand inside blocks, so they're
  // looked up first and a building keeps its own start.
  const cells = { block: new Map<string, Site[]>(), lot: new Map<string, Site[]>() };
  for (const site of sites) {
    const margin = site.kind === "lot" ? MARGIN : 0;
    const [x0, z0] = cellAt(site.x - margin, site.z - margin);
    const [x1, z1] = cellAt(site.x + site.w + margin, site.z + site.d + margin);
    for (let cx = x0; cx <= x1; cx += 1) {
      for (let cz = z0; cz <= z1; cz += 1) {
        const key = `${cx},${cz}`;
        cells[site.kind].set(key, [...(cells[site.kind].get(key) ?? []), site]);
      }
    }
  }
  const outskirts = (x: number, z: number) =>
    LEAD + Math.min(GROUND_BROKEN, Math.hypot(x - CENTER, z - CENTER) * 0.03);
  const tallest = Math.max(STREET_TOP, ...sites.map((site) => site.top ?? 0));
  return {
    end: LEAD + GROUND_BROKEN + tallest / RISE + SETTLE,
    sites,
    startAt: (x, z) => {
      const key = cellAt(x, z).join(",");
      return (
        (
          cells.lot.get(key)?.find((site) => contains(site, x, z, MARGIN)) ??
          cells.block.get(key)?.find((site) => contains(site, x, z))
        )?.start ?? outskirts(x, z)
      );
    },
  };
};
