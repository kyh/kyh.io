// The dragon's long body (`dragon.ts`), built in the round and seen from a
// little above (`../follower/solid.ts`): a tapering tube lying along the way
// its head swam (`dragon-trail.ts`), a neck bending from the head to the
// trail, a slow wave of height running down it as a dancing dragon's does, and
// its last stretch swinging on a chain. Cut into segments, each a layer, so
// coils cross over and under each other by true depth. Each ring has its own
// frame, rolled as its stretch of the trail was, so its gold belly comes round
// into view only where it banks. In its own pixels about its head: x along the
// screen, y up, z toward the camera. Pure.
import type { Part } from "../follower/creature";
import type { Mat3, Vec3 } from "../follower/solid";
import type { Point } from "../follower/walk";
import type { Dragon } from "./dragon";
import { round } from "../art";
import { chainAbout } from "../follower/chain";
import {
  add,
  apply,
  compose,
  cross,
  depthOf,
  dot,
  hullPath,
  linePath,
  linesPath,
  mix,
  normalize,
  PITCH,
  pitchOf,
  rollOf,
  scale,
  smooth,
  sub,
  toScreen,
  TOWARD_CAMERA,
  yawOf,
} from "../follower/solid";
import { trailAt } from "./dragon-trail";

/** How many segments its body's cut into, and how many rings each spans. */
export const SEGMENTS = 12;
const RINGS_EACH = 2;
export const RINGS = SEGMENTS * RINGS_EACH + 1;
/** Pixels of trail from its head to its first ring, and between rings. */
const FIRST = 5;
const GAP = 4.1;
/** Pixels of trail its body lies along, and what the trail must keep. */
export const LENGTH = FIRST + GAP * (RINGS - 1);
export const REACH = LENGTH + 16;
/** How thick it is at its thickest, pixels, and how far down it (0 to 1) that is. */
const GIRTH = 5.1;
const FULLEST = 0.2;
/** The rings its neck bends over, from its head onto the trail. */
const NECK = 6;
/** Which ring its swinging stretch starts at, and how many rings to a link of its chain. */
export const TAIL_FROM = 16;
const TAIL_EACH = 2;
/** The wave of height down its body: pixels, and pixels from crest to crest. */
const WAVE = 5.6;
const WAVE_LENGTH = 76;
/** How far its belly's gold wraps round from its middle, radians: level, all out of sight; rolled, the scales fan up its flank. */
const BELLY = 0.46;
const BELLY_ROLLED = 1.1;
/** The farthest up its flank the gold comes, seen: a third of its width, so a hard bank doesn't turn it into a gold prawn. */
const BELLY_EDGE = Math.asin(2 * 0.35 - 1);
/** Up and to the left, where the town's light comes from: as `solid.ts` has it. */
const LIGHT: Point = { x: -0.55, y: -0.83 };
/** How much of the width it shades, turned square from the light. */
const SHADE = 0.34;
/** The rings that carry its legs, and how long a leg is. */
export const LEGS = [
  { ring: 4, side: 1 },
  { ring: 4, side: -1 },
  { ring: 15, side: 1 },
  { ring: 15, side: -1 },
] as const;
const LEG = 7.5;

const COS = Math.cos(PITCH);

/** A ring of its body: where it is about its head, its frame (forward toward its head), and its radius. */
export interface Ring {
  at: Vec3;
  along: Vec3;
  up: Vec3;
  side: Vec3;
  r: number;
  roll: number;
}

/** Its fins this frame: swept back by `lean`, rippling, and which rings' stand over their segment. */
export interface Fins {
  lean: number;
  ripple: number;
  over: readonly boolean[];
}

/** How thick it is at a ring, as a share of its girth: slim at the neck, tapering long to the tail. */
const shareAt = (index: number) => {
  const t = index / (RINGS - 1);
  if (t < FULLEST) {
    return 0.8 + 0.2 * smooth(t / FULLEST);
  }
  return 1 - 0.8 * ((t - FULLEST) / (1 - FULLEST)) ** 1.35;
};

/** Where its head is and how it's turned. */
export const headFrameOf = (dragon: Dragon) => {
  const { rig, swim } = dragon;
  const yaw = rig.aim.x + rig.look.x;
  const pitch = rig.nod.x;
  const roll = rig.tip.x + swim.roll.x * 0.45;
  const own: Mat3 = compose(yawOf(yaw), compose(pitchOf(pitch), rollOf(roll)));
  const world: Vec3 = [swim.x, swim.h.x + rig.rear.x, swim.z];
  return { own, pitch, roll, world, yaw };
};

export type HeadFrame = ReturnType<typeof headFrameOf>;

/** A point of the trail as its body lies there, in the world, with the waves running down it. */
const lieAt = (dragon: Dragon, behind: number, wave: number) => {
  const { rig, swim, wave: phase } = dragon;
  const here = trailAt(swim.trail, behind);
  const ahead = trailAt(swim.trail, Math.max(0, behind - 3));
  const next = trailAt(swim.trail, behind + 3);
  const dx = ahead.x - next.x;
  const dz = ahead.z - next.z;
  const length = Math.hypot(dx, dz) || 1;
  // Pointing at the camera, a tall wave would have it seen end on.
  const across = 1 - 0.45 * Math.abs(dz / length);
  const lively = 1 - 0.75 * rig.doze.x;
  const height = wave * across * lively * Math.sin((Math.PI * 2 * behind) / WAVE_LENGTH - phase);
  const sway = wave * 0.34 * lively * Math.sin((Math.PI * 2 * behind) / 58 - phase * 0.8 + 1);
  return {
    at: [
      here.x - (dz / length) * sway,
      here.h + height,
      here.z + (dx / length) * sway,
    ] satisfies Vec3,
    roll: here.roll,
  };
};

/** Its neck: a curve out of the back of its head and onto the trail. */
const neckOf = (from: Vec3, out: Vec3, to: Vec3, into: Vec3, t: number) => {
  const u = 1 - t;
  const a = add(from, scale(out, 8));
  const b = add(to, scale(into, 8));
  return add(
    add(scale(from, u * u * u), scale(a, 3 * u * u * t)),
    add(scale(b, 3 * u * t * t), scale(to, t * t * t)),
  );
};

/** The frame of a ring with its neighbours where they are, rolled. */
const frameAt = (ahead: Vec3, behind: Vec3, roll: number) => {
  const along = normalize(sub(ahead, behind));
  const level = normalize(sub([0, 1, 0], scale(along, along[1])));
  const flank = cross(along, level);
  const c = Math.cos(roll);
  const s = Math.sin(roll);
  return {
    along,
    side: sub(scale(flank, c), scale(level, s)),
    up: add(scale(level, c), scale(flank, s)),
  };
};

const behindOf = (index: number) => FIRST + index * GAP;
/** How high its wave runs at a ring: none at its head, which holds its line. */
const waveAt = (index: number) => WAVE * smooth(behindOf(index) / 34);

/** Its rings, head to tail, before the chain's swung the last of them. */
export const spineOf = (dragon: Dragon, head: HeadFrame): Ring[] => {
  const lying = Array.from({ length: RINGS + 1 }, (_, index) =>
    lieAt(dragon, behindOf(index), waveAt(index)),
  );
  const neckEnd = lying[NECK] ?? { at: head.world, roll: 0 };
  const beyond = lying[NECK + 1] ?? neckEnd;
  const forward = apply(head.own, [1, 0, 0]);
  const start = add(head.world, scale(forward, -2.5));
  const out = scale(forward, -1);
  const into = normalize(sub(neckEnd.at, beyond.at));
  const worlds = lying.map(({ at }, index) =>
    index < NECK ? neckOf(start, out, neckEnd.at, into, (index + 0.6) / (NECK + 0.6)) : at,
  );
  const breath = 1 + 0.07 * dragon.rig.doze.x * Math.sin(dragon.time * 1.7);
  return Array.from({ length: RINGS }, (_, index) => {
    const here = worlds[index] ?? head.world;
    const ahead = worlds[index - 1] ?? start;
    const behind = worlds[index + 1] ?? here;
    const roll = (lying[index]?.roll ?? 0) * (1 - dragon.rig.doze.x);
    return {
      ...frameAt(ahead, behind, roll),
      at: sub(here, head.world),
      r: GIRTH * shareAt(index) * breath,
      roll,
    };
  });
};

/** The rings its chain hangs from, on the screen about its head: one a link. */
export const tailPoints = (rings: readonly Ring[]): Point[] =>
  rings
    .filter((_, index) => index >= TAIL_FROM && (index - TAIL_FROM) % TAIL_EACH === 0)
    .map(({ at }) => toScreen(at));

/** Its rings with its tail swung as its chain has it. */
export const swungOf = (rings: readonly Ring[], chain: Dragon["tail"], origin: Point): Ring[] => {
  const rest = tailPoints(rings);
  const knots = chainAbout(chain, origin);
  const offAt = (link: number): Point => {
    const knot = knots[link];
    const was = rest[link];
    return knot && was ? { x: knot.x - was.x, y: knot.y - was.y } : { x: 0, y: 0 };
  };
  return rings.map((ring, index) => {
    if (index <= TAIL_FROM) {
      return ring;
    }
    const along = (index - TAIL_FROM) / TAIL_EACH;
    const link = Math.floor(along);
    const a = offAt(link);
    const b = offAt(link + 1);
    const t = along - link;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    return { ...ring, at: add(ring.at, [x, -y / COS, 0]) };
  });
};

/** A point on a ring's surface, `angle` round from its flank toward its top. */
const surface = (ring: Ring, angle: number): Vec3 =>
  add(
    ring.at,
    add(scale(ring.side, ring.r * Math.cos(angle)), scale(ring.up, ring.r * Math.sin(angle))),
  );

/** The angle round a ring that faces the camera. */
const facedAt = (ring: Ring) =>
  Math.atan2(dot(TOWARD_CAMERA, ring.up), dot(TOWARD_CAMERA, ring.side));

const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

/** Which way across the screen a ring's width lies. */
const acrossOf = (rings: readonly Ring[], index: number): Point => {
  const a = toScreen(rings[Math.max(0, index - 1)]?.at ?? [0, 0, 0]);
  const b = toScreen(rings[Math.min(rings.length - 1, index + 1)]?.at ?? [0, 0, 0]);
  const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { x: (a.y - b.y) / length, y: (b.x - a.x) / length };
};

/** The two edges of the tube at a ring as seen, and those of its lit part. */
const edgesOf = (rings: readonly Ring[], ring: Ring, index: number) => {
  const c = toScreen(ring.at);
  const n = acrossOf(rings, index);
  const lit = n.x * LIGHT.x + n.y * LIGHT.y;
  const shade = 2 * ring.r * SHADE * Math.abs(lit);
  const at = (by: number): Point => ({ x: c.x + n.x * by, y: c.y + n.y * by });
  return {
    left: at(ring.r),
    litLeft: at(ring.r - (lit < 0 ? shade : 0)),
    litRight: at(-ring.r + (lit > 0 ? shade : 0)),
    right: at(-ring.r),
  };
};

type Edges = ReturnType<typeof edgesOf>;

/** The two edges of its gold belly at a ring as seen: met at the rim, where it's out of sight. */
const bellyAt = (ring: Ring) => {
  const faced = facedAt(ring);
  const middle = wrap(-Math.PI / 2 - faced);
  const half = BELLY + BELLY_ROLLED * Math.abs(ring.roll);
  const lo = Math.max(middle - half, -Math.PI / 2);
  const hi = Math.min(middle + half, BELLY_EDGE);
  const rim = (Math.sign(middle) * Math.PI) / 2;
  const shown = lo < hi;
  return {
    from: toScreen(surface(ring, faced + (shown ? lo : rim))),
    to: toScreen(surface(ring, faced + (shown ? hi : rim))),
  };
};

const polygon = (points: readonly Point[]) =>
  `${points.map(({ x, y }, index) => `${index === 0 ? "M" : "L"}${round(x)} ${round(y)}`).join("")}Z`;

const polyline = (points: readonly Point[]) =>
  points.map(({ x, y }, index) => `${index === 0 ? "M" : "L"}${round(x)} ${round(y)}`).join("");

const toward = (a: Point, b: Point, t: number): Point => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

/** The ring's near half: a line round the tube, curved as the tube's turned. */
const hoopOf = (ring: Ring) => {
  const faced = facedAt(ring);
  return polyline([-1.4, -0.8, 0, 0.8, 1.4].map((angle) => toScreen(surface(ring, faced + angle))));
};

/** A fin on its spine: a little cone, so it's never seen as a stick; `lean` swept back along it. */
const finOf = (ring: Ring, height: number, lean: number) => {
  const base = add(ring.at, scale(ring.up, ring.r * 0.9));
  const tip = add(add(base, scale(ring.up, height)), scale(ring.along, -lean));
  return hullPath([
    add(base, scale(ring.along, 2)),
    add(base, scale(ring.along, -2.2)),
    add(base, scale(ring.side, 0.8)),
    add(base, scale(ring.side, -0.8)),
    tip,
  ]);
};

/** How tall its fin stands at a ring: tallest over its shoulders, down to nothing near its tail. */
const finHeight = (index: number) => {
  const t = index / (RINGS - 1);
  return 1.2 + 2.4 * shareAt(index) * (1 - 0.3 * t);
};

/** A leg (`LEGS`): hip, knee, foot, tucked back along it the faster it swims, and its claws. */
const legOf = (ring: Ring, side: number, stroke: number, tuck: number) => {
  const flank = scale(ring.side, side);
  const hip = add(add(ring.at, scale(flank, ring.r * 0.8)), scale(ring.up, -ring.r * 0.3));
  const back = mix([0.15, -0.8, 0.35], [-0.9, -0.28, 0.2], tuck);
  const reach = normalize(
    add(
      add(scale(ring.along, back[0] + 0.3 * stroke), scale(ring.up, back[1])),
      scale(flank, back[2]),
    ),
  );
  const foot = add(hip, scale(reach, LEG));
  const knee = add(
    add(hip, scale(reach, LEG * 0.5)),
    add(scale(flank, 1.4), scale(ring.along, 1.2)),
  );
  const toes = [-0.55, 0, 0.55].map((spread) => [
    foot,
    add(
      foot,
      add(
        scale(reach, 1.2),
        add(scale(ring.along, 1.5 * Math.cos(spread)), scale(flank, 1.5 * Math.sin(spread))),
      ),
    ),
  ]);
  return { claws: linesPath(toes), leg: linePath([hip, knee, foot]) };
};

/** One segment's parts this frame. */
const segmentOf = (
  rings: readonly Ring[],
  allEdges: readonly Edges[],
  segment: number,
  { lean, over, ripple }: Fins,
) => {
  const first = segment * RINGS_EACH;
  const indexes = Array.from({ length: RINGS_EACH + 1 }, (_, step) => first + step);
  const edges = indexes.flatMap((index) => allEdges[index] ?? []);
  const bellies = indexes.flatMap((index) => {
    const ring = rings[index];
    return ring ? [bellyAt(ring)] : [];
  });
  const last = edges.at(-1);
  // Each laid a little under the next, so no seam of the page shows between them.
  const next = allEdges[first + RINGS_EACH + 1];
  const lap = (pick: (edge: Edges) => Point) =>
    next && last ? [toward(pick(last), pick(next), 0.2)] : [];
  const whole = polygon([
    ...edges.map(({ left }) => left),
    ...lap(({ left }) => left),
    ...lap(({ right }) => right),
    ...edges.map(({ right }) => right).toReversed(),
  ]);
  const lit = polygon([
    ...edges.map(({ litLeft }) => litLeft),
    ...lap(({ litLeft }) => litLeft),
    ...lap(({ litRight }) => litRight),
    ...edges.map(({ litRight }) => litRight).toReversed(),
  ]);
  const belly = polygon([
    ...bellies.map(({ from }) => from),
    ...bellies.map(({ to }) => to).toReversed(),
  ]);
  const hoops = indexes.slice(1).flatMap((index) => {
    const ring = rings[index];
    return ring ? [hoopOf(ring)] : [];
  });
  const ends = polyline(edges.map(({ left }) => left)) + polyline(edges.map(({ right }) => right));
  const closed = !next && last ? polyline([last.left, last.right]) : "";
  const fins = indexes.slice(0, RINGS_EACH).flatMap((index) => {
    const ring = rings[index];
    if (!ring || index < 1 || index >= RINGS - 3) {
      return [];
    }
    const height = finHeight(index);
    const sweep = lean * height + ripple * Math.sin(index * 0.9);
    return [{ front: over[index] ?? true, path: finOf(ring, height, sweep) }];
  });
  const finsOn = (front: boolean) =>
    fins
      .filter((fin) => fin.front === front)
      .map(({ path }) => path)
      .join("");
  return [
    [`seg-${segment}`, { d: whole }],
    [`lit-${segment}`, { d: lit }],
    [`belly-${segment}`, { d: belly }],
    [`hoops-${segment}`, { d: hoops.join("") }],
    [`edge-${segment}`, { d: ends + closed }],
    [`fin-back-${segment}`, { d: finsOn(false) }],
    [`fin-front-${segment}`, { d: finsOn(true) }],
  ] satisfies [string, Part][];
};

/** Which segment a ring of its legs is drawn in. */
export const segmentAt = (ring: number) => Math.min(SEGMENTS - 1, Math.floor(ring / RINGS_EACH));

/** Its body's parts. */
export const bodyOf = (rings: readonly Ring[], fins: Fins) => {
  const edges = rings.map((ring, index) => edgesOf(rings, ring, index));
  return Array.from({ length: SEGMENTS }, (_, index) =>
    segmentOf(rings, edges, index, fins),
  ).flat();
};

/** How near the camera each segment is, by its middle ring. */
export const segmentDepths = (rings: readonly Ring[]) =>
  Array.from({ length: SEGMENTS }, (_, index) =>
    depthOf(rings[index * RINGS_EACH + 1]?.at ?? [0, 0, 0]),
  );

/** How much each leg's flank faces the camera. */
export const legFacings = (rings: readonly Ring[]) =>
  LEGS.map(({ ring, side }) => side * dot(rings[ring]?.side ?? [0, 0, 0], TOWARD_CAMERA));

/** How much each ring's top faces the camera: past nothing, its fin stands in front of its body. */
export const finFacings = (rings: readonly Ring[]) => rings.map(({ up }) => dot(up, TOWARD_CAMERA));

/** Its legs' parts: each drawn behind its segment on the far side, over it on the near. */
export const legsOf = (
  rings: readonly Ring[],
  near: readonly boolean[],
  stroke: number,
  tuck: number,
): [string, Part][] =>
  LEGS.flatMap(({ ring: index, side }, leg) => {
    const ring = rings[index];
    if (!ring) {
      return [];
    }
    const { claws, leg: path } = legOf(
      ring,
      side,
      Math.sin(stroke + leg * 1.7) * (1 - tuck * 0.6),
      tuck,
    );
    const front = near[leg] ?? true;
    return [
      [`leg-${leg}-front`, { d: front ? path : "" }],
      [`claws-${leg}-front`, { d: front ? claws : "" }],
      [`leg-${leg}-back`, { d: front ? "" : path }],
      [`claws-${leg}-back`, { d: front ? "" : claws }],
    ] satisfies [string, Part][];
  });

/** Its rings as seen: the mouse's way onto it. */
export const ringsSeen = (rings: readonly Ring[]) =>
  rings.map(({ at, r }) => ({ ...toScreen(at), r }));
