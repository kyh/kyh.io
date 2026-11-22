import type { Chain } from "../follower/chain";
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
  finFacings,
  headFrameOf,
  legFacings,
  legsOf,
  ringsSeen,
  segmentDepths,
  spineOf,
  swungOf,
  tailPoints,
} from "./dragon-body";

const HEAD_SIZE = 1.14;
const SKULL: Vec3 = [0, 0.4, 0];
const SKULL_R: Vec3 = [7.2, 6.4, 6.2];
const MUZZLE: Vec3 = [9.4, -0.8, 0];
const MUZZLE_R: Vec3 = [7.6, 3.8, 4.6];
const NOSE: Vec3 = [15.2, 0.9, 1.5];
const NOSE_R: Vec3 = [2.4, 1.7, 2.1];
const JAW: Vec3 = [8, -1.8, 0];
const JAW_R: Vec3 = [7.2, 1.8, 3.8];
const HINGE: Vec3 = [1.5, -2.8, 0];
const GAPE = 0.72;

/** How many locks in its mane. */
export const LOCKS = 5;
const LOCK_LINKS = 4;
const WHISKER_LINKS = 5;
const BEARD_LINKS = 3;
export const TUFTS = 3;
const TUFT_LINKS = 3;
const ON_HEAD = 20;
const HEAD_MIDDLE = -6;
const ON_BODY = 5;

const SOLIDS = new Set(["jaw", "muzzle", "skull"]);

const side3 = ([x, y, z]: Vec3, side: number) => [x, y, z * side] satisfies Vec3;

const buildFrame = (dragon: Dragon) => {
  const head = headFrameOf(dragon);
  const rings = spineOf(dragon, head);

  return { head, origin: toScreen(head.world), rings };
};

type Frame = ReturnType<typeof buildFrame>;

const frames = new WeakMap<Dragon, { frame: Frame; steps: number }>();

const frameOf = (dragon: Dragon) => {
  const kept = frames.get(dragon);

  if (kept?.steps === dragon.steps) {
    return kept.frame;
  }

  const frame = buildFrame(dragon);
  frames.set(dragon, { frame, steps: dragon.steps });

  return frame;
};

const headOf = (dragon: Dragon, frame: HeadFrame) => {
  const direction = (local: Vec3) => apply(frame.own, local);

  const point = (local: Vec3) =>
    direction(add(scale(local, HEAD_SIZE), [dragon.rig.reach.x, 0, 0]));

  const open = pitchOf(-GAPE * dragon.rig.jaw.x);
  const hinged = (local: Vec3) => add(HINGE, apply(open, sub(local, HINGE)));
  const jawTurn = (local: Vec3) => direction(apply(open, local));

  return { direction, hinged, jawTurn, point };
};

type Head = ReturnType<typeof headOf>;

const solidOf = (head: Head, center: Vec3, radii: Vec3) =>
  ({
    center: head.point(center),
    radii: scale(radii, HEAD_SIZE),
    turn: head.direction,
  }) satisfies Ellipsoid;

const solidParts = (name: string, body: Ellipsoid) => {
  const { lit, whole } = solidPaths(ellipseOf(body.center, axesOf(body)));

  return [
    [name, { d: whole }],
    [`${name}-lit`, { d: lit }],
  ] satisfies [string, Part][];
};

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

const ribbonPath = (points: readonly Point[], width: number) => {
  const last = points.length - 1;

  const offset = (index: number, side: number) => {
    const here = points[index] ?? { x: 0, y: 0 };
    const a = points[Math.max(0, index - 1)] ?? here;
    const b = points[Math.min(last, index + 1)] ?? here;
    const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const half = (width / 2) * (1 - (index / last) ** 1.4);

    return {
      x: here.x + (side * half * (a.y - b.y)) / length,
      y: here.y + (side * half * (b.x - a.x)) / length,
    } satisfies Point;
  };

  const leftSide = points.map((_, index) => offset(index, 1));
  const rightSide = points.map((_, index) => offset(index, -1)).toReversed();
  const start = leftSide[0] ?? { x: 0, y: 0 };
  const turn = rightSide[0] ?? start;

  return `M${round(start.x)} ${round(start.y)}${through(leftSide)}L${round(turn.x)} ${round(turn.y)}${through(rightSide)}Z`;
};

const LOCK_AT = [
  { around: 1.57, reach: 1.15 },
  { around: 0.75, reach: 1 },
  { around: 2.39, reach: 1 },
  { around: -0.1, reach: 0.8 },
  { around: 3.24, reach: 0.8 },
] as const;

const lockPoints = (head: Head, limp: number, index: number) => {
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

const whiskerPoints = (head: Head, limp: number, side: number) => {
  const root: Vec3 = [15.4, -0.2, 3 * side];

  return Array.from({ length: WHISKER_LINKS + 1 }, (_, link) => {
    const t = link / WHISKER_LINKS;

    const lying = head.point(
      add(root, [-30 * t ** 1.3 * (1 - 0.45 * limp), -3 * t + 6 * t * t, 10 * t * side]),
    );

    return add(lying, [0, -9 * limp * t * t, 0]);
  });
};

const beardPoints = (head: Head) => {
  const root = head.hinged([9.5, -3.4, 0]);

  return Array.from({ length: BEARD_LINKS + 1 }, (_, link) => {
    const t = link / BEARD_LINKS;

    return head.point(add(root, [-3 * t, -8.5 * t, 0]));
  });
};

const tuftPoints = (rings: readonly Ring[], index: number) => {
  const ring = rings.at(-1);

  if (!ring) {
    return [] satisfies Vec3[];
  }

  const fan = (index - (TUFTS - 1) / 2) * 0.55;

  const out = normalize(
    add(scale(ring.along, -1), add(scale(ring.up, fan), scale(ring.side, fan * 0.7))),
  );

  return Array.from({ length: TUFT_LINKS + 1 }, (_, link) =>
    add(ring.at, scale(out, (12 - Math.abs(fan) * 3) * (link / TUFT_LINKS))),
  ) satisfies Vec3[];
};

const hangFrom = (points: readonly Vec3[], origin: Point) => hangOf(points.map(toScreen), origin);

/** Where its tail's chain hangs: the rings of its last stretch, as the trail lays them. */
export const tailHangOf = (dragon: Dragon) => {
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

const eyesOf = (dragon: Dragon, head: Head) => {
  const { content, doze } = dragon.rig;
  const shut = smooth(Math.max(doze.x, content.x, dragon.blink) * 2 - 0.5);
  const arch = 1.5 * content.x - 0.5 * Math.max(doze.x, dragon.blink);

  return [1, -1].flatMap((side, index) => {
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
    ] satisfies [string, Part][];
  });
};

const nostrilsOf = (head: Head) =>
  [1, -1].map((side, index) => {
    const out = normalize([0.72, 0.58, 0.38 * side]);
    const normal = head.direction(out);

    const center = head.point(
      add(side3(NOSE, side), [out[0] * NOSE_R[0], out[1] * NOSE_R[1], out[2] * NOSE_R[2]]),
    );

    const across = normalize(cross(normal, head.direction([0.3, 1, -0.5 * side])));

    return [
      `nostril-${index}`,
      {
        d: ellipsePath(
          ellipseOf(center, [scale(across, 0.95), scale(cross(normal, across), 0.32)]),
        ),
        opacity: round(smooth((facing(normal) - 0.02) / 0.2)),
      },
    ];
  });

const lipsOf = (head: Head) =>
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

const fang = (at: Vec3, down: number) =>
  [
    add(at, [0.9, 0, 0]),
    add(at, [-0.9, 0, 0]),
    add(at, [0, 0, 0.6]),
    add(at, [0, 0, -0.6]),
    add(at, [0.2, down, 0]),
  ] satisfies Vec3[];

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

const earOf = (head: Head, side: number) =>
  hullPath(
    [
      side3([-1.6, 4, 5.2], side),
      side3([-5, 4.4, 4.8], side),
      side3([-3, 2.2, 5.8], side),
      side3([-12, 5, 10.6], side),
    ].map(head.point),
  );

const depthsOf = (dragon: Dragon) => {
  const frame = frameOf(dragon);
  const head = headOf(dragon, frame.head);
  const depths = segmentDepths(frame.rings);
  const headDepth = depthOf(head.point(SKULL));
  const held = depths.map((depth, index) => (index < 2 ? Math.min(depth, headDepth - 2) : depth));

  return {
    body: new Map<string, number>([
      ...held.map((depth, index) => [`seg-${index}`, depth] satisfies [string, number]),
      ["head", headDepth],
    ]),
    head: new Map<string, number>([
      ["skull", headDepth],
      ["muzzle", depthOf(head.point(MUZZLE))],
      ["jaw", depthOf(head.point(head.hinged(JAW))) - 1],
      ["beard", depthOf(head.point(head.hinged([9.5, -5, 0]))) - 1.5],
      ...[1, -1].flatMap(
        (side, index) =>
          [[`whisker-${index}`, depthOf(head.point(side3([12, -1, 8], side)))]] satisfies [
            string,
            number,
          ][],
      ),
      ...Array.from({ length: LOCKS }, (_, index) => {
        const { around } = LOCK_AT[index] ?? { around: 0 };
        const near = head.point([-6, 0.4 + 7 * Math.sin(around), 7 * Math.cos(around)]);

        return [`mane-${index}`, depthOf(near)] satisfies [string, number];
      }),
    ]),
  };
};

const BODY_MARGIN = 2.5;
const HEAD_MARGIN = 1;

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
  /** Each ring's fin over its segment. */
  fins: boolean[];
}

const LEG_TURN = 0.15;
const FIN_TURN = 0.1;

const heldOver = (facings: number, was: boolean | undefined, turn: number) => {
  const near = was ?? facings > 0;

  return near ? facings > -turn : facings > turn;
};

export const stackingOf = (dragon: Dragon, was: Stacking | null) => {
  const depths = depthsOf(dragon);
  const { rings } = frameOf(dragon);

  return {
    body: settle(was?.body ?? sorted(depths.body), depths.body, BODY_MARGIN),
    fins: finFacings(rings).map((facings, index) => heldOver(facings, was?.fins[index], FIN_TURN)),
    head: settle(was?.head ?? sorted(depths.head), depths.head, HEAD_MARGIN),
    legs: legFacings(rings).map((facings, index) => heldOver(facings, was?.legs[index], LEG_TURN)),
  } satisfies Stacking;
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

const puffsOf = (dragon: Dragon, origin: Point) =>
  dragon.puffs.map(({ age, life, x, y }, index) => {
    const t = life > 0 ? age / life : 1;
    const shown = life > 0 && t < 1;
    const r = 2 + 4 * t;

    return [
      `puff-${index}`,
      {
        d: shown ? ellipsePath({ angle: 0, cx: x - origin.x, cy: y - origin.y, rx: r, ry: r }) : "",
        opacity: shown ? round(0.7 * Math.min(1, t * 8, (1 - t) * 1.8)) : 0,
      },
    ];
  });

/** Where its breath leaves it, on the screen: a little off the end of its nose. */
export const noseAt = (dragon: Dragon) => {
  const frame = frameOf(dragon);
  const seen = toScreen(headOf(dragon, frame.head).point([NOSE[0] + 5, NOSE[1], 0]));

  return { x: frame.origin.x + seen.x, y: frame.origin.y + seen.y } satisfies Point;
};

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

export const dragonPose = (dragon: Dragon) => {
  const frame = frameOf(dragon);
  const head = headOf(dragon, frame.head);
  const { origin } = frame;
  const rings = swungOf(frame.rings, dragon.tail, origin);

  const body = bodyOf(rings, {
    lean: dragon.lean.x,
    over: dragon.stacking.fins,
    ripple: dragon.ripple,
  });

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
    ...[1, -1].flatMap(
      (side, index) =>
        [
          [`horn-${index}`, { d: hornOf(head, side) }],
          [`ear-${index}`, { d: earOf(head, side) }],
        ] satisfies [string, Part][],
    ),
    ...dragon.whiskers.map(
      (chain, index) =>
        [`whisker-${index}`, { d: chainPath(chain, origin) }] satisfies [string, Part],
    ),
    ...dragon.mane.map(
      (chain, index) =>
        [`mane-${index}`, { d: ribbonOf(chain, origin, 4.6) }] satisfies [string, Part],
    ),
    ["beard", { d: ribbonOf(dragon.beard, origin, 4.2) }],
    ...dragon.tufts.map(
      (chain, index) =>
        [`tuft-${index}`, { d: ribbonOf(chain, origin, 5) }] satisfies [string, Part],
    ),
    ...puffsOf(dragon, origin),
  ]) satisfies Record<string, Part>;

  const { lead } = dragon;

  return {
    at: { x: origin.x + lead.x, y: origin.y + lead.y },
    bubble: { x: 0, y: -30 },
    order: [...dragon.stacking.body, ...headOrder(dragon.stacking.head), "puffs"],
    parts,
    say: dragon.emotes.line,
  } satisfies Pose;
};
