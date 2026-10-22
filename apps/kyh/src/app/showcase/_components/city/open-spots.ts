// The town's open spots a theme can decorate, worked out from the layout
// draw-blocks.ts draws (houseCells, parkOf, plazaOf), so the decorations land
// where the town leaves room. Pure.
import type { HouseSpec } from "./draw-blocks";
import type { CityPlan } from "./plan";
import { doorstep, houseCells, parkOf, plazaOf } from "./draw-blocks";

export type Spot = readonly [x: number, z: number];

/**
 * The kinds of open place a theme can decorate: beside each cottage's door
 * (porch), a garden's corner furthest from its tree and bush (yard), round
 * the pond between the water and the trees (shore), the square round its
 * fountain and the ball courts, with room for something big (square), and the
 * square's fountain, for the theme's one giant piece (centerpiece).
 */
export const KINDS = ["porch", "yard", "shore", "square", "centerpiece"] as const;

export type Kind = (typeof KINDS)[number];

/** The open places, by kind, and the cottages themselves, the same in every view. */
type Spots = Record<Kind, Spot[]> & { houses: HouseSpec[] };

const distance = ([ax, az]: Spot, [bx, bz]: Spot) => Math.hypot(ax - bx, az - bz);

const spotsIn = (plan: CityPlan): Spots => {
  const spots: Spots = {
    centerpiece: [],
    houses: [],
    porch: [],
    shore: [],
    square: [],
    yard: [],
  };
  for (const block of plan.blocks) {
    if (block.use === "houses") {
      for (const cell of houseCells(block)) {
        if ("house" in cell) {
          const { x, z } = doorstep(cell.house);
          spots.porch.push([x, z]);
          spots.houses.push(cell.house);
          continue;
        }
        const { bush, lot, tree } = cell;
        const taken: Spot[] = bush ? [[tree.x, tree.z], bush] : [[tree.x, tree.z]];
        const corners: Spot[] = [
          [lot.x + 0.3, lot.z + 0.3],
          [lot.x + lot.w - 0.3, lot.z + 0.3],
          [lot.x + 0.3, lot.z + lot.d - 0.3],
          [lot.x + lot.w - 0.3, lot.z + lot.d - 0.3],
        ];
        const roomAt = (corner: Spot) => Math.min(...taken.map((spot) => distance(corner, spot)));
        const [open] = corners.toSorted((a, b) => roomAt(b) - roomAt(a));
        if (open) {
          spots.yard.push(open);
        }
      }
    } else if (block.use === "plaza") {
      // The diagonals between the fountain and the corner trees, clear of the lamps.
      const { cx, cz } = plazaOf(block);
      spots.centerpiece.push([cx, cz]);
      for (const [dx, dz] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ] as const) {
        spots.square.push([cx + dx * 1.05, cz + dz * 1.05]);
      }
    } else if (block.use === "park") {
      const { court, pond, style } = parkOf(block);
      if (style === 0) {
        // Just past the water's edge, inside the ring the trees keep out of.
        for (let index = 0; index < 8; index += 1) {
          const angle = (index / 8) * Math.PI * 2 + 0.3;
          spots.shore.push([
            pond.x + Math.cos(angle) * (pond.rx + 0.1),
            pond.z + Math.sin(angle) * (pond.rz + 0.1),
          ]);
        }
      } else if (style === 2) {
        const middle = court.z + court.d / 2;
        for (const along of [0.25, 0.5, 0.75]) {
          spots.square.push([court.x + court.w * along, middle]);
        }
      }
    }
  }
  return spots;
};

const spotsOf = new WeakMap<CityPlan, Spots>();

/** The town's open spots, worked out once per plan. */
export const openSpots = (plan: CityPlan) => {
  let spots = spotsOf.get(plan);
  if (!spots) {
    spots = spotsIn(plan);
    spotsOf.set(plan, spots);
  }
  return spots;
};
