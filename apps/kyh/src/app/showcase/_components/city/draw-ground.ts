// The island itself: a pale shallows halo, a beach, the land, waves on the
// sea, and the road grid with its curbed blocks.
import type { CityPlan, Junction, Rect } from "./plan";
import type { Random } from "@/lib/random";
import type { Sketch, Vec3 } from "./sketch";
import { paint } from "./palette";
import { coastline, inland } from "./plan";
import { box, face, ground, line } from "./sketch";

const ROAD_Y = 0.01;
const CURB = paint("paving", "wallLeft", "wallRight");

const flatRect = (rect: Rect, y: number): Vec3[] => [
  [rect.x, y, rect.z],
  [rect.x + rect.w, y, rect.z],
  [rect.x + rect.w, y, rect.z + rect.d],
  [rect.x, y, rect.z + rect.d],
];

const drawWaves = (sketch: Sketch, random: Random) => {
  for (let index = 0; index < 260; index += 1) {
    const x = random.range(-10, 82);
    const z = random.range(-10, 82);
    const depth = -inland(x, z);
    // Thickest near the shore, thinning out to open sea.
    if (depth > 1.5 && random.chance(Math.max(0.12, 1 - depth / 18))) {
      const w = random.range(0.35, 0.7);
      line(
        sketch,
        [
          [x - w, -0.04, z + w],
          [x - w * 0.3, -0.04, z + w * 0.3 - 0.12],
          [x + w * 0.3, -0.04, z - w * 0.3 + 0.12],
          [x + w, -0.04, z - w],
        ],
        "hair",
        "wave",
      );
    }
  }
};

const roadRect = (from: Junction, to: Junction, axis: "x" | "z"): Rect =>
  axis === "x"
    ? { d: 1, w: to.x - from.x - 1, x: from.x + 0.5, z: from.z - 0.5 }
    : { d: to.z - from.z - 1, w: 1, x: from.x - 0.5, z: from.z + 0.5 };

const drawRoad = (sketch: Sketch, rect: Rect, axis: "x" | "z") => {
  face(sketch, "road", flatRect(rect, ROAD_Y), null);
  const { x, z, w, d } = rect;
  const edges: [Vec3, Vec3][] =
    axis === "x"
      ? [
          [
            [x, ROAD_Y, z],
            [x + w, ROAD_Y, z],
          ],
          [
            [x, ROAD_Y, z + d],
            [x + w, ROAD_Y, z + d],
          ],
        ]
      : [
          [
            [x, ROAD_Y, z],
            [x, ROAD_Y, z + d],
          ],
          [
            [x + w, ROAD_Y, z],
            [x + w, ROAD_Y, z + d],
          ],
        ];
  for (const edge of edges) {
    line(sketch, edge, "hair", "inkSoft");
  }
  const span = axis === "x" ? w : d;
  for (let t = 0.35; t + 0.3 < span; t += 0.75) {
    const a: Vec3 = axis === "x" ? [x + t, ROAD_Y, z + 0.5] : [x + 0.5, ROAD_Y, z + t];
    const b: Vec3 = axis === "x" ? [x + t + 0.3, ROAD_Y, z + 0.5] : [x + 0.5, ROAD_Y, z + t + 0.3];
    line(sketch, [a, b], "hair", "roadMark");
  }
};

/** Zebra stripes across each road where it leaves a junction. */
const drawCrossing = (sketch: Sketch, rect: Rect, axis: "x" | "z", end: "start" | "end") => {
  const stripes = 4;
  for (let index = 0; index < stripes; index += 1) {
    const offset = 0.14 + index * 0.2;
    const along = end === "start" ? 0.08 : (axis === "x" ? rect.w : rect.d) - 0.3;
    const stripe: Rect =
      axis === "x"
        ? { d: 0.1, w: 0.22, x: rect.x + along, z: rect.z + offset }
        : { d: 0.22, w: 0.1, x: rect.x + offset, z: rect.z + along };
    face(sketch, "white", flatRect(stripe, ROAD_Y + 0.002), null);
  }
};

export const drawGround = (sketch: Sketch, plan: CityPlan, random: Random) => {
  ground(sketch, "shore", coastline(1.8), -0.05, null);
  ground(sketch, "sand", plan.coast, -0.02, "fine");
  ground(sketch, "land", coastline(-1.1), 0, null);
  drawWaves(sketch, random);
  const junctions = new Map(plan.junctions.map((junction) => [junction.id, junction]));
  for (const road of plan.roads) {
    const from = junctions.get(road.from);
    const to = junctions.get(road.to);
    if (from && to) {
      const rect = roadRect(from, to, road.axis);
      drawRoad(sketch, rect, road.axis);
      drawCrossing(sketch, rect, road.axis, "start");
      drawCrossing(sketch, rect, road.axis, "end");
    }
  }
  for (const junction of plan.junctions) {
    face(
      sketch,
      "road",
      flatRect({ d: 1, w: 1, x: junction.x - 0.5, z: junction.z - 0.5 }, ROAD_Y),
      null,
    );
  }
  for (const block of plan.blocks) {
    box(sketch, { colors: CURB, d: block.d, h: 0.04, w: block.w, x: block.x, z: block.z });
  }
};
