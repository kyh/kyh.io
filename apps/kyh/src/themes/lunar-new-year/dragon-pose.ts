// How the dragon (`dragon.ts`) looks this frame, built in the round and seen
// from a little above (`../follower/solid.ts`), so it turns through every view
// rather than flipping: its body (`dragon-body.ts`), and a head of solids (a
// round skull, a long muzzle ending in a gold nose, a gold jaw that drops), two
// eyes under gold brows, horns spreading back, whiskers from its nose, a beard
// at its chin and a mane of gold locks round the back of its skull, each of
// those on a chain (`../follower/chain.ts`) so they stream behind and swing on
// a stop. Every part is a layer stacked by true depth, held till it's clearly
// past what it's stacked with, so nothing flickers. In its own pixels about its
// head. Pure.
import type { Chain, Hang } from "../follower/chain";
import type { Part, Pose } from "../follower/creature";
import type { Ellipsoid, Vec3 } from "../follower/solid";
import type { Point } from "../follower/walk";
import type { Dragon } from "./dragon";
import type { HeadFrame, Ring } from "./dragon-body";
import { round } from "../art";
import { chainAbout, chainPath, hangOf } from "../follower/chain";
import {
  add,
  apply,
  axesOf,
  cross,
  curveOf,
  depthOf,
  ellipseOf,
  ellipsePath,
  facing,
  hullPath,
  linePath,
  normalize,
  pitchOf,
  scale,
  smooth,
  solidPaths,
  sub,
  tangentsOf,
  toScreen,
} from "../follower/solid";
import {
  bodyOf,
  headFrameOf,
  legFacings,
  legsOf,
  ringsSeen,
  segmentDepths,
  spineOf,
  swungOf,
  tailPoints,
} from "./dragon-body";

/** How big its head's drawn, to the measures below: about the ghost's head. */
const HEAD_SIZE = 1.14;
/** Its head's solids, about the skull's middle: x forward along its nose, y up, z across. */
const SKULL: Vec3 = [0, 0.4, 0];
const SKULL_R: Vec3 = [7.2, 6.4, 6.2];
const MUZZLE: Vec3 = [9.4, -0.8, 0];
const MUZZLE_R: Vec3 = [7.6, 3.8, 4.6];
/** Its nose: two gold mounds side by side at the end of its muzzle, its nostrils on them. */
const NOSE: Vec3 = [15.2, 1.1, 2.1];
const NOSE_R: Vec3 = [2.4, 1.9, 2];
const JAW: Vec3 = [8, -1.8, 0];
const JAW_R: Vec3 = [7.2, 1.8, 3.8];
/** Where its jaw hinges, and how far it drops open (radians). */
const HINGE: Vec3 = [1.5, -2.8, 0];
const GAPE = 0.72;
/** How many locks in its mane. */
export const LOCKS = 5;
const LOCK_LINKS = 4;
const WHISKER_LINKS = 5;
const BEARD_LINKS = 3;
export const TUFTS = 3;
const TUFT_LINKS = 3;
/** Pixels from its head's middle to the mouse's way onto it: a little above, for its horns. */
const ON_HEAD = 20;
const HEAD_MIDDLE = -6;
/** Pixels past a ring's edge that's still on it. */
const ON_BODY = 5;

/** The layers inked as one. */
const SOLIDS = new Set(["jaw", "muzzle", "skull"]);

const side3 = ([x, y, z]: Vec3, side: number): Vec3 => [x, y, z * side];

/** Its frame this frame: its head, and its rings as the trail lays them. */
const buildFrame = (dragon: Dragon) => {
  const head = headFrameOf(dragon);
  const rings = spineOf(dragon, head);
  return { head, origin: toScreen(head.world), rings };
};

type Frame = ReturnType<typeof buildFrame>;

const frames = new WeakMap<Dragon, { frame: Frame; steps: number }>();
const frameOf = (dragon: Dragon): Frame => {
  const kept = frames.get(dragon);
  if (kept?.steps === dragon.steps) {
    return kept.frame;
  }
  const frame = buildFrame(dragon);
  frames.set(dragon, { frame, steps: dragon.steps });
  return frame;
};

const headOf = (dragon: Dragon, frame: HeadFrame) => {
  const direction = (local: Vec3): Vec3 => apply(frame.own, local);
  const point = (local: Vec3): Vec3 =>
    direction(add(scale(local, HEAD_SIZE), [dragon.rig.reach.x, 0, 0]));
  const open = pitchOf(-GAPE * dragon.rig.jaw.x);
  const hinged = (local: Vec3): Vec3 => add(HINGE, apply(open, sub(local, HINGE)));
  const jawTurn = (local: Vec3): Vec3 => direction(apply(open, local));
  return { direction, hinged, jawTurn, point };
};

type Head = ReturnType<typeof headOf>;

const solidOf = (head: Head, center: Vec3, radii: Vec3): Ellipsoid => ({
  center: head.point(center),
  radii: scale(radii, HEAD_SIZE),
  turn: head.direction,
});

const solidParts = (name: string, body: Ellipsoid): [string, Part][] => {
  const { lit, whole } = solidPaths(ellipseOf(body.center, axesOf(body)));
  return [
    [name, { d: whole }],
    [`${name}-lit`, { d: lit }],
  ];
};

/** A smooth run along points, past the first of them. */
const through = (side: readonly Point[]) => {
  let d = "";
  for (let index = 1; index < side.length - 1; index += 1) {
    const here = side[index] ?? { x: 0, y: 0 };
    const next = side[index + 1] ?? here;
    const toX = index === side.length - 2 ? next.x : (here.x + next.x) / 2;
    const toY = index === side.length - 2 ? next.y : (here.y + next.y) / 2;
    d += `Q${round(here.x)} ${round(here.y)} ${round(toX)} ${round(toY)}`;
  }
  return d;
};

/** A ribbon along points, narrowing from `width` at its root to a point at its tip. */
const ribbonPath = (points: readonly Point[], width: number) => {
  const last = points.length - 1;
  const offset = (index: number, side: number): Point => {
    const here = points[index] ?? { x: 0, y: 0 };
    const a = points[Math.max(0, index - 1)] ?? here;
    const b = points[Math.min(last, index + 1)] ?? here;
    const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const half = (width / 2) * (1 - (index / last) ** 1.4);
    return {
      x: here.x + (side * half * (a.y - b.y)) / length,
      y: here.y + (side * half * (b.x - a.x)) / length,
    };
  };
  const leftSide = points.map((_, index) => offset(index, 1));
  const rightSide = points.map((_, index) => offset(index, -1)).toReversed();
  const start = leftSide[0] ?? { x: 0, y: 0 };
  const turn = rightSide[0] ?? start;
  return `M${round(start.x)} ${round(start.y)}${through(leftSide)}L${round(turn.x)} ${round(turn.y)}${through(rightSide)}Z`;
};

/** Each lock of its mane: where it grows round the back of its skull, and which way out it lies. */
const LOCK_AT = [
  { around: 1.57, reach: 1.15 },
  { around: 0.75, reach: 1 },
  { around: 2.39, reach: 1 },
  { around: -0.1, reach: 0.8 },
  { around: 3.24, reach: 0.8 },
] as const;

/** A lock's hang: out from the back of its skull, along its neck, drooping a little. */
const lockPoints = (head: Head, limp: number, index: number): Vec3[] => {
  const { around, reach } = LOCK_AT[index] ?? { around: 0, reach: 1 };
  const y = Math.sin(around);
  const z = Math.cos(around);
  const root: Vec3 = [-5, 0.4 + 4.2 * y, 4.2 * z];
  return Array.from({ length: LOCK_LINKS + 1 }, (_, link) => {
    const t = link / LOCK_LINKS;
    const length = 16 * reach * t * (1 - 0.4 * limp);
    const lying = head.point(
      add(root, [-length, (5 * y - 2.5 * t) * t * reach, 6 * z * t * reach]),
    );
    return add(lying, [0, -11 * limp * reach * t * t, 0]);
  });
};

/** A whisker's hang: out of its nose to its side, trailing back past its cheek. */
const whiskerPoints = (head: Head, limp: number, side: number): Vec3[] => {
  const root: Vec3 = [15.4, -0.2, 3 * side];
  return Array.from({ length: WHISKER_LINKS + 1 }, (_, link) => {
    const t = link / WHISKER_LINKS;
    const lying = head.point(
      add(root, [-30 * t ** 1.3 * (1 - 0.45 * limp), -3 * t + 6 * t * t, 10 * t * side]),
    );
    return add(lying, [0, -9 * limp * t * t, 0]);
  });
};

const beardPoints = (head: Head): Vec3[] => {
  const root = head.hinged([9.5, -3.4, 0]);
  return Array.from({ length: BEARD_LINKS + 1 }, (_, link) => {
    const t = link / BEARD_LINKS;
    return head.point(add(root, [-3 * t, -8.5 * t, 0]));
  });
};

/** A tuft at its tail's tip: fanning back off it. */
const tuftPoints = (rings: readonly Ring[], index: number): Vec3[] => {
  const ring = rings.at(-1);
  if (!ring) {
    return [];
  }
  const fan = (index - (TUFTS - 1) / 2) * 0.55;
  const out = normalize(
    add(scale(ring.along, -1), add(scale(ring.up, fan), scale(ring.side, fan * 0.7))),
  );
  return Array.from({ length: TUFT_LINKS + 1 }, (_, link) =>
    add(ring.at, scale(out, (12 - Math.abs(fan) * 3) * (link / TUFT_LINKS))),
  );
};

const hangFrom = (points: readonly Vec3[], origin: Point): Hang =>
  hangOf(points.map(toScreen), origin);

/** Where its tail's chain hangs: the rings of its last stretch, as the trail lays them. */
export const tailHangOf = (dragon: Dragon): Hang => {
  const { origin, rings } = frameOf(dragon);
  return hangOf(tailPoints(rings), origin);
};

/** Where its head's and tail tip's chains hang this frame. */
export const hangsOf = (dragon: Dragon) => {
  const frame = frameOf(dragon);
  const head = headOf(dragon, frame.head);
  const swung = swungOf(frame.rings, dragon.tail, frame.origin);
  return {
    beard: hangFrom(beardPoints(head), frame.origin),
    mane: Array.from({ length: LOCKS }, (_, index) =>
      hangFrom(lockPoints(head, dragon.limp, index), frame.origin),
    ),
    tufts: Array.from({ length: TUFTS }, (_, index) =>
      hangFrom(tuftPoints(swung, index), frame.origin),
    ),
    whiskers: [1, -1].map((side) => hangFrom(whiskerPoints(head, dragon.limp, side), frame.origin)),
  };
};

const disc = (center: Vec3, normal: Vec3, radius: number) => {
  const [u, v] = tangentsOf(normal);
  return ellipsePath(ellipseOf(center, [scale(u, radius), scale(v, radius)]));
};

/** Its eyes: each side of its skull under a gold brow, shut as its lids come down. */
const eyesOf = (dragon: Dragon, head: Head): [string, Part][] => {
  const { content, doze } = dragon.rig;
  const shut = smooth(Math.max(doze.x, content.x, dragon.blink) * 2 - 0.5);
  const arch = 1.5 * content.x - 0.5 * Math.max(doze.x, dragon.blink);
  return [1, -1].flatMap((side, index): [string, Part][] => {
    const out = normalize([0.5, 0.42, 0.76 * side]);
    const normal = head.direction(out);
    const center = head.point(add([1.6, 0.4, 0], scale(out, 6)));
    const shown = smooth((facing(normal) - 0.04) / 0.1);
    const open = round(shown * (1 - shut));
    const up = head.direction([0, 1, 0]);
    const back = head.direction([-1, 0, 0]);
    const u = normalize(cross(normal, up));
    const glint = add(add(center, scale(up, 0.6)), scale(back, 0.35));
    const browFaces = head.direction([0.2, 0.7, 0.68 * side]);
    const brow = curveOf(
      head.point([8, 3.4, 2.1 * side]),
      head.point([4.6, 6.9, 5 * side]),
      head.point([-1.8, 5.8, 5.6 * side]),
      5,
    );
    return [
      [`eye-${index}`, { d: disc(center, normal, 2.6), opacity: open }],
      [`pupil-${index}`, { d: disc(add(center, scale(normal, 0.1)), normal, 1.55), opacity: open }],
      [`glint-${index}`, { d: disc(add(glint, scale(normal, 0.2)), normal, 0.48), opacity: open }],
      [
        `lid-${index}`,
        {
          d: linePath(
            curveOf(
              add(center, scale(u, 2.3)),
              add(center, scale(up, arch)),
              add(center, scale(u, -2.3)),
              4,
            ),
          ),
          opacity: round(shown * shut),
        },
      ],
      [
        `brow-${index}`,
        { d: linePath(brow), opacity: round(smooth((facing(browFaces) - 0.1) / 0.15)) },
      ],
    ];
  });
};

/** Its nostrils, each side of its nose's top: seen from the front and the side. */
const nostrilsOf = (head: Head): [string, Part][] =>
  [1, -1].map((side, index) => {
    const out = normalize([0.72, 0.58, 0.38 * side]);
    const normal = head.direction(out);
    const center = head.point(
      add(side3(NOSE, side), [out[0] * NOSE_R[0], out[1] * NOSE_R[1], out[2] * NOSE_R[2]]),
    );
    return [
      `nostril-${index}`,
      { d: disc(center, normal, 0.7), opacity: round(smooth((facing(normal) - 0.02) / 0.2)) },
    ];
  });

/** Its lips: a line along each side of its muzzle, turned up at the back in a smile. */
const lipsOf = (head: Head): [string, Part][] =>
  [1, -1].map((side, index) => {
    const line = curveOf(
      head.point([16, -1.6, 2.2 * side]),
      head.point([9, -4.2, 5.2 * side]),
      head.point([2.6, -1.4, 5.8 * side]),
      6,
    );
    const shown = smooth((facing(head.direction([0, -0.2, side])) - 0.05) / 0.3);
    return [`lip-${index}`, { d: linePath(line), opacity: round(shown) }];
  });

/** A fang: a little cone, so it's a tooth from any side. */
const fang = (at: Vec3, down: number): Vec3[] => [
  add(at, [0.9, 0, 0]),
  add(at, [-0.9, 0, 0]),
  add(at, [0, 0, 0.6]),
  add(at, [0, 0, -0.6]),
  add(at, [0.2, down, 0]),
];

/** Its teeth: two fangs from its muzzle and two from its jaw, longer as it opens. */
const fangsOf = (dragon: Dragon, head: Head) => {
  const long = 1.5 + 1.2 * dragon.rig.jaw.x;
  const uppers = [1, -1].map((side) =>
    hullPath(fang([13, -3.6, 2.6 * side], -long).map(head.point)),
  );
  const lowers = [1, -1].map((side) =>
    hullPath(
      fang([11.6, -1.2, 2.2 * side], 1.1 + dragon.rig.jaw.x)
        .map(head.hinged)
        .map(head.point),
    ),
  );
  return { lowers: lowers.join(""), uppers: uppers.join("") };
};

/** The inside of its mouth, seen as it opens. */
const mouthOf = (dragon: Dragon, head: Head) => {
  const roof: Vec3[] = [
    [15, -2.2, 2.2],
    [15, -2.2, -2.2],
    [3, -2.2, 4],
    [3, -2.2, -4],
  ];
  const floor: Vec3[] = [
    [14, -1.4, 2.4],
    [14, -1.4, -2.4],
    [3, -2.4, 3.6],
    [3, -2.4, -3.6],
  ];
  const tongue: Vec3[] = [
    [11.5, -1.2, 1.1],
    [11.5, -1.2, -1.1],
    [4, -1.8, 1.8],
    [4, -1.8, -1.8],
  ];
  const opacity = round(smooth(dragon.rig.jaw.x * 6));
  return {
    mouth: {
      d: hullPath([...roof.map(head.point), ...floor.map(head.hinged).map(head.point)]),
      opacity,
    },
    tongue: { d: hullPath(tongue.map(head.hinged).map(head.point)), opacity },
  };
};

/** A horn: from its crown, back, out and up at the tip. */
const hornOf = (head: Head, side: number) => {
  const beam = curveOf(
    head.point(side3([-1, 5, 2.6], side)),
    head.point(side3([-10, 6.5, 5.4], side)),
    head.point(side3([-13.5, 12.5, 7], side)),
    6,
  );
  const fork = beam[3] ?? [0, 0, 0];
  const tine = curveOf(
    fork,
    add(fork, head.direction(side3([0.4, 2.2, 0.4], side))),
    add(fork, head.direction(side3([2.4, 5, 1], side))),
    3,
  );
  return ribbonPath(beam.map(toScreen), 3.8) + ribbonPath(tine.map(toScreen), 2);
};

/** An ear: a little cone laid back by its horn. */
const earOf = (head: Head, side: number) =>
  hullPath(
    [
      side3([-1.6, 4, 5.2], side),
      side3([-5, 4.4, 4.8], side),
      side3([-3, 2.2, 5.8], side),
      side3([-12, 5, 10.6], side),
    ].map(head.point),
  );

/** How near the camera each layer's part of it is. */
const depthsOf = (dragon: Dragon) => {
  const frame = frameOf(dragon);
  const head = headOf(dragon, frame.head);
  const depths = segmentDepths(frame.rings);
  const headDepth = depthOf(head.point(SKULL));
  // Its head is over its own neck from every side: the join is under its mane.
  const held = depths.map((depth, index) => (index < 2 ? Math.min(depth, headDepth - 2) : depth));
  return {
    body: new Map<string, number>([
      ...held.map((depth, index): [string, number] => [`seg-${index}`, depth]),
      ["head", headDepth],
    ]),
    head: new Map<string, number>([
      ["skull", headDepth],
      ["muzzle", depthOf(head.point(MUZZLE))],
      ["jaw", depthOf(head.point(head.hinged(JAW))) - 1],
      ["beard", depthOf(head.point(head.hinged([9.5, -5, 0]))) - 1.5],
      ...[1, -1].flatMap((side, index): [string, number][] => [
        [`horn-${index}`, depthOf(head.point(side3([-3, 7, 5], side)))],
        [`ear-${index}`, depthOf(head.point(side3([-5, 4.4, 7], side)))],
        [`whisker-${index}`, depthOf(head.point(side3([12, -1, 8], side)))],
      ]),
      ...Array.from({ length: LOCKS }, (_, index): [string, number] => {
        const { around } = LOCK_AT[index] ?? { around: 0 };
        const near = head.point([-6, 0.4 + 7 * Math.sin(around), 7 * Math.cos(around)]);
        return [`mane-${index}`, depthOf(near)];
      }),
    ]),
  };
};

/** How far past what it's stacked with a layer must be to change places: past it either way, so nothing flickers. */
const BODY_MARGIN = 2.5;
const HEAD_MARGIN = 1;

/** The layers kept in order, each moved only once it's clearly past the one it's stacked over. */
const settle = (order: readonly string[], depths: ReadonlyMap<string, number>, margin: number) => {
  const kept = order.filter((name) => depths.has(name));
  for (let index = 1; index < kept.length; index += 1) {
    let at = index;
    while (at > 0) {
      const here = kept[at] ?? "";
      const below = kept[at - 1] ?? "";
      if ((depths.get(here) ?? 0) >= (depths.get(below) ?? 0) - margin) {
        break;
      }
      kept[at] = below;
      kept[at - 1] = here;
      at -= 1;
    }
  }
  return kept;
};

const sorted = (depths: ReadonlyMap<string, number>) =>
  [...depths.keys()].toSorted((a, b) => (depths.get(a) ?? 0) - (depths.get(b) ?? 0));

export interface Stacking {
  body: string[];
  head: string[];
  /** Each leg on the near side of its segment. */
  legs: boolean[];
}

/** How far a leg's flank is turned past side on before it changes sides of its segment. */
const LEG_TURN = 0.15;

export const stackingOf = (dragon: Dragon, was: Stacking | null): Stacking => {
  const depths = depthsOf(dragon);
  const legs = legFacings(frameOf(dragon).rings).map((facings, index) => {
    const near = was?.legs[index] ?? facings > 0;
    return near ? facings > -LEG_TURN : facings > LEG_TURN;
  });
  return {
    body: settle(was?.body ?? sorted(depths.body), depths.body, BODY_MARGIN),
    head: settle(was?.head ?? sorted(depths.head), depths.head, HEAD_MARGIN),
    legs,
  };
};

/** Whether a point on the screen is on it: its head, or a ring of its body. */
export const isOn = (dragon: Dragon, at: Point) => {
  const { origin, rings } = frameOf(dragon);
  const x = at.x - origin.x;
  const y = at.y - origin.y;
  if (Math.hypot(x, y - HEAD_MIDDLE) < ON_HEAD) {
    return true;
  }
  return ringsSeen(rings).some((ring) => Math.hypot(ring.x - x, ring.y - y) < ring.r + ON_BODY);
};

const ribbonOf = (chain: Chain, origin: Point, width: number) =>
  ribbonPath(chainAbout(chain, origin), width);

/** Smoke puffed from its nose, each a little round cloud rising and thinning. */
const puffsOf = (dragon: Dragon, origin: Point): [string, Part][] =>
  dragon.puffs.map(({ age, life, x, y }, index) => {
    const t = life > 0 ? age / life : 1;
    const shown = life > 0 && t < 1;
    const r = 1.4 + 3 * t;
    return [
      `puff-${index}`,
      {
        d: shown ? ellipsePath({ angle: 0, cx: x - origin.x, cy: y - origin.y, rx: r, ry: r }) : "",
        opacity: shown ? round(Math.min(1, (1 - t) * 1.8)) : 0,
      },
    ];
  });

/** Its head's layers, the ink round its solids under the first of them: one outline, no seams inside it. */
const headOrder = (layers: readonly string[]) => {
  const first = layers.findIndex((name) => SOLIDS.has(name));
  const last = layers.findLastIndex((name) => SOLIDS.has(name)) + 1;
  return [
    ...layers.slice(0, first),
    "head-ink",
    ...layers.slice(first, last),
    "face",
    ...layers.slice(last),
  ];
};

export const dragonPose = (dragon: Dragon): Pose => {
  const frame = frameOf(dragon);
  const head = headOf(dragon, frame.head);
  const { origin } = frame;
  const rings = swungOf(frame.rings, dragon.tail, origin);
  const body = bodyOf(rings, dragon.lean.x, dragon.ripple);
  const jaw: Ellipsoid = {
    center: head.point(head.hinged(JAW)),
    radii: scale(JAW_R, HEAD_SIZE),
    turn: head.jawTurn,
  };
  const skull = solidOf(head, SKULL, SKULL_R);
  const muzzle = solidOf(head, MUZZLE, MUZZLE_R);
  const noses = [1, -1].map((side) => solidOf(head, side3(NOSE, side), NOSE_R));
  const fangs = fangsOf(dragon, head);
  const outline = [skull, muzzle, ...noses, jaw]
    .map((solid) => ellipsePath(ellipseOf(solid.center, axesOf(solid))))
    .join("");
  const parts = Object.fromEntries([
    ...body,
    ...legsOf(rings, dragon.stacking.legs, dragon.swim.weave * 1.6, dragon.tuck),
    ["head-ink", { d: outline }],
    ...solidParts("skull", skull),
    ...solidParts("muzzle", muzzle),
    ...noses.flatMap((nose, index) => solidParts(`nose-${index}`, nose)),
    ...solidParts("jaw", jaw),
    ...Object.entries(mouthOf(dragon, head)),
    ["fangs-upper", { d: fangs.uppers }],
    ["fangs-lower", { d: fangs.lowers }],
    ...eyesOf(dragon, head),
    ...nostrilsOf(head),
    ...lipsOf(head),
    ...[1, -1].flatMap((side, index): [string, Part][] => [
      [`horn-${index}`, { d: hornOf(head, side) }],
      [`ear-${index}`, { d: earOf(head, side) }],
    ]),
    ...dragon.whiskers.map((chain, index): [string, Part] => [
      `whisker-${index}`,
      { d: chainPath(chain, origin) },
    ]),
    ...dragon.mane.map((chain, index): [string, Part] => [
      `mane-${index}`,
      { d: ribbonOf(chain, origin, 4.6) },
    ]),
    ["beard", { d: ribbonOf(dragon.beard, origin, 4.2) }],
    ...dragon.tufts.map((chain, index): [string, Part] => [
      `tuft-${index}`,
      { d: ribbonOf(chain, origin, 5) },
    ]),
    ...puffsOf(dragon, origin),
  ]) satisfies Record<string, Part>;
  const { lead } = dragon;
  return {
    at: { x: origin.x + lead.x, y: origin.y + lead.y },
    bubble: { x: 0, y: -30 },
    order: [...dragon.stacking.body, ...headOrder(dragon.stacking.head), "puffs"],
    parts,
    say: dragon.emotes.line,
  };
};
