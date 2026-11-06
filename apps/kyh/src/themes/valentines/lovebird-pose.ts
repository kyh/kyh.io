// How the lovebird (`lovebird.ts`) looks this frame, built in the round and
// seen from a little above (`../follower/solid.ts`): a plump green body with
// its blue rump on its back, a big round head held level whatever the body
// does, its forehead red and its face and throat peach, a white ring round
// each eye and a pale hooked beak; two wings, each an arm and a hand, folded
// against its sides along its back or spread and stroking, the hand bent
// after the arm; a short tail of feathers fanning, trailing on its chain, and
// feet tucked up flying, thrown forward to land and gripping the pointer's
// tip perched. Ruffled, the feather tips stand out round its body and head.
// Its body heaves against its wingbeats, banks, pitches and sways over its
// feet; each part is a layer stacked by how near the camera it is. In its own
// pixels: x forward, y up, z to its left, its feet at the origin. Pure.
import type { Hang } from "../follower/chain";
import type { Part, Pose } from "../follower/creature";
import type { Ellipse, Mat3, Vec3 } from "../follower/solid";
import type { Point } from "../follower/walk";
import type { Lovebird } from "./lovebird";
import { HELD, upstrokeAt } from "./wingbeat";
import { round } from "../art";
import { chainAbout, hangOf } from "../follower/chain";
import {
  add,
  apply,
  axesOf,
  capPath,
  compose,
  cross,
  dot,
  depthOf,
  ellipseOf,
  ellipsePath,
  facing,
  hullPath,
  linePath,
  linesPath,
  mix,
  normalize,
  pitchOf,
  rollOf,
  scale,
  smooth,
  solidPaths,
  sub,
  tangentsOf,
  toScreen,
  TOWARD_CAMERA,
  yawOf,
} from "../follower/solid";

/**
 * How big it's drawn, to its own pixels: about the ghost's size on the
 * screen. Its flight and its tail's chain are in screen pixels.
 */
export const SIZE = 1.2;
/** Its body's middle, above its feet, and its body's half lengths: along it, up and across. */
const BODY: Vec3 = [0, 10.5, 0];
const BODY_RADII: Vec3 = [10.5, 8.2, 8];
/** Its head's middle, from its body's (in its body's frame), and its head's size. */
const NECK: Vec3 = [9.2, 2.6, 0];
const HEAD_R = 7;
/** Its blue rump: the cap of its body past a plane tipped back and up (as for a unit sphere). */
const RUMP_NORMAL: Vec3 = [-0.8, 0.6, 0];
const RUMP_OFFSET = 0.84;
/** Its face, throat and cheeks, peach; its forehead, red: caps of its head. */
const FACE_NORMAL: Vec3 = [1, -0.55, 0];
const FACE_OFFSET = 0;
const BROW_NORMAL: Vec3 = [0.95, 0.32, 0];
const BROW_OFFSET = 0.72;
/** Its shoulder, from its body's middle (its left one; the right is mirrored). */
const SHOULDER: Vec3 = [4, 5, 5.2];
/** Its hip, from its body's middle. */
const HIP: Vec3 = [1.5, -6, 2.6];
/** Its tail's root, from its body's middle, and its length. */
const TAIL_ROOT: Vec3 = [-9, -0.5, 0];
const TAIL_LENGTH = 11;
/** Its tail's feathers. */
const FEATHERS = 7;
/** How many links its tail's chain has. */
const TAIL_LINKS = 3;
/** Its wing's outline, leading root, wrist, tip, then back along the trailing edge to its root. */
const WRIST = 1;
const TIP = 2;
/**
 * The wing folded, about its body's middle (the left one): its wrist at the
 * front of its flank, the leading edge of its hand along its side, its
 * flight feathers lying along its back, their tips crossed over its rump.
 */
const FOLDED: readonly Vec3[] = [
  [5.5, 5.2, 5.8],
  [6.5, 0.6, 7],
  [-16, 1.5, 2.2],
  [-12, 4.2, 3.4],
  [-6, 5.8, 5],
  [-1, 6.4, 5.4],
  [2.5, 6.6, 5],
];
/** The wing spread, about its shoulder, held out flat (the left one, its span along +z). */
const SPREAD: readonly Vec3[] = [
  [1.2, 0, 0],
  [2.5, 0.4, 8.5],
  [-4.5, 0, 23],
  [-9.5, 0, 18.5],
  [-9.5, 0, 11],
  [-8.5, 0, 5],
  [-7, 0, 0],
];
/** How much of each point is on its hand, bent after the arm. */
const HAND_SHARE = [0, 0, 1, 1, 0.5, 0, 0] as const;

const side3 = ([x, y, z]: Vec3, side: number): Vec3 => [x, y, z * side];
const at = (points: readonly Vec3[], index: number): Vec3 => points[index] ?? [0, 0, 0];

/** Its frame this frame: how a point or a direction of its body is placed in the world. */
const frameOf = (bird: Lovebird) => {
  const { rig, wings } = bird;
  // Perched, it sways over its feet in the screen's plane: + clockwise.
  const tilt = pitchOf(-bird.sway.x);
  const yaw = yawOf(rig.heading.x);
  const body = compose(pitchOf(rig.pitch.x), rollOf(rig.bank.x + bird.shiver));
  const orient = compose(tilt, compose(yaw, body));
  // Its body heaves against its wings: up as they beat down, down as they rise.
  const heave = -0.9 * (wings.arm - HELD) * rig.spread.x * rig.amp.x * (1 - bird.perch);
  const steady = add(apply(tilt, BODY), [0, rig.lift.x - bird.dip.x, 0]);
  const center = add(steady, [0, heave, 0]);
  const turn = (direction: Vec3): Vec3 => apply(orient, direction);
  const place = (local: Vec3): Vec3 => add(center, turn(local));
  /** Placed on its body without the heave of its beats: for what trails off it (its tail's chain). */
  const placeSteady = (local: Vec3): Vec3 => add(steady, turn(local));
  const puff = 1 + 0.08 * rig.fluff.x;
  return { center, place, placeSteady, puff, steady, tilt, turn, yaw };
};

type Frame = ReturnType<typeof frameOf>;

const solid = (name: string, outline: Ellipse): [string, Part][] => {
  const { lit, whole } = solidPaths(outline);
  return [
    [name, { d: whole }],
    [`${name}-lit`, { d: lit }],
  ];
};

/** A point round an ellipse on the screen, `out` times as far from its middle. */
const rimAt = ({ angle, cx, cy, rx, ry }: Ellipse, t: number, out: number): Point => {
  const turn = (angle * Math.PI) / 180;
  const along = rx * Math.cos(t) * out;
  const across = ry * Math.sin(t) * out;
  return {
    x: cx + along * Math.cos(turn) - across * Math.sin(turn),
    y: cy + along * Math.sin(turn) + across * Math.cos(turn),
  };
};

const pointPath = (points: readonly Point[]) =>
  `${points.map((p, index) => `${index === 0 ? "M" : "L"}${round(p.x)} ${round(p.y)}`).join("")}Z`;

/** Feather tips standing out round an outline as it's ruffled: drawn under it, only what stands out shows. */
const tuftsOf = (outline: Ellipse, ruffle: number, count: number, turn: number) => {
  const r = Math.min(outline.rx, outline.ry);
  const out = 1 + (2.4 * ruffle) / Math.max(r, 1);
  return Array.from({ length: count }, (_, index) => {
    const t = turn + (index / count) * Math.PI * 2;
    // A feather's tip: broad at its base, laid back a little the way round it goes.
    return pointPath([
      rimAt(outline, t - 0.26, 0.92),
      rimAt(outline, t - 0.06, (out + 1) / 2),
      rimAt(outline, t + 0.06, out),
      rimAt(outline, t + 0.26, 0.92),
    ]);
  }).join("");
};

const mid = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/** A closed curve round points, rounded through each but the sharp ones, which it passes through. */
const loopPath = (points: readonly Point[], sharp: ReadonlySet<number>) => {
  const n = points.length;
  const p = (index: number) => points[((index % n) + n) % n] ?? { x: 0, y: 0 };
  const start = sharp.has(0) ? p(0) : mid(p(-1), p(0));
  let d = `M${round(start.x)} ${round(start.y)}`;
  for (let index = sharp.has(0) ? 1 : 0; index <= n; index += 1) {
    const here = p(index);
    const next = mid(here, p(index + 1));
    if (sharp.has(index % n)) {
      d += `L${round(here.x)} ${round(here.y)}`;
      if (index < n) {
        d += `L${round(next.x)} ${round(next.y)}`;
      }
    } else if (index < n || !sharp.has(0)) {
      d += `Q${round(here.x)} ${round(here.y)} ${round(next.x)} ${round(next.y)}`;
    }
  }
  return `${d}Z`;
};

/** Its body: its outline, ruffled tips, and the blue of its rump. */
const bodyOf = (bird: Lovebird, frame: Frame) => {
  const radii = scale(BODY_RADII, frame.puff);
  const body = { center: frame.center, radii, turn: frame.turn };
  const outline = ellipseOf(frame.center, axesOf(body));
  return {
    depth: depthOf(frame.center),
    outline,
    rump: capPath(body, RUMP_NORMAL, RUMP_OFFSET),
    tufts: tuftsOf(outline, bird.rig.fluff.x, 11, 0.3),
  };
};

/** Its head: where it is, held level and steady, and its own turn, nod and cock. */
const headOf = (bird: Lovebird, frame: Frame) => {
  const { rig } = bird;
  const [hx, hy, hz] = rig.head;
  // Dozing, it's drawn down into its shoulders.
  const neck = add(NECK, [-1.5 * rig.doze.x, -1.6 * rig.doze.x, 0]);
  const center = add(
    add(frame.steady, apply(frame.tilt, apply(frame.yaw, apply(pitchOf(rig.pitch.x), neck)))),
    [hx.x, hy.x, hz.x],
  );
  const own: Mat3 = compose(
    yawOf(rig.heading.x + rig.look.x),
    compose(pitchOf(rig.nod.x), rollOf(rig.cock.x)),
  );
  const direction = (local: Vec3) => apply(own, local);
  const point = (local: Vec3) => add(center, direction(local));
  const r = HEAD_R * (1 + 0.05 * rig.fluff.x);
  const sphere = { center, radii: [r, r, r] as const, turn: direction };
  return { center, direction, point, r, sphere };
};

type Head = ReturnType<typeof headOf>;

/** Its eyes: a white ring and a dark eye with a glint, each side of its head, seen as it faces. */
const eyesOf = (bird: Lovebird, head: Head) => {
  const shut = bird.rig.doze.x;
  return [1, -1].flatMap((side, index) => {
    const out = normalize([0.44, 0.26, 0.86 * side]);
    const normal = head.direction(out);
    const center = head.point(scale(out, head.r - 0.25));
    const [u, v] = tangentsOf(normal);
    const shown = smooth((facing(normal) - 0.05) / 0.25);
    const disc = (radius: number, by: Vec3 = [0, 0, 0]) =>
      ellipsePath(ellipseOf(add(center, by), [scale(u, radius), scale(v, radius)]));
    const glint = add(
      scale(head.direction([0, 1, 0]), 0.45),
      scale(head.direction([-1, 0, 0]), 0.3),
    );
    return [
      [`ring-${index}`, { d: disc(2.05), opacity: round(shown) }],
      [`eye-${index}`, { d: disc(1.2, scale(normal, 0.15)), opacity: round(shown * (1 - shut)) }],
      [
        `glint-${index}`,
        { d: disc(0.38, add(glint, scale(normal, 0.3))), opacity: round(shown * (1 - shut)) },
      ],
      [
        `lid-${index}`,
        {
          d: linePath([add(center, scale(u, 1.7)), add(center, scale(u, -1.7))]),
          opacity: round(shown * shut),
        },
      ],
    ] as const;
  });
};

/** Its beak: a deep hooked upper half over a small lower one that opens as it chirps. */
const beakOf = (bird: Lovebird, head: Head) => {
  const upper: Vec3[] = [
    [5.6, 2.8, 0],
    [6.3, 0.2, 2],
    [6.3, 0.2, -2],
    [9, 1.4, 0],
    [10.4, -1.4, 0],
    [9.8, -3, 0],
    [6.6, -1.4, 0],
  ];
  const hinge: Vec3 = [6.2, -1.4, 0];
  const open = pitchOf(-0.55 * bird.rig.beak.x);
  const lower = (
    [
      [6.2, -1.4, 1.5],
      [6.2, -1.4, -1.5],
      [6.6, -3.4, 0],
      [8.8, -2.9, 0],
    ] satisfies Vec3[]
  ).map((point) => add(hinge, apply(open, sub(point, hinge))));
  return {
    front: depthOf(head.point([10.4, -1.4, 0])) > depthOf(head.center),
    lower: hullPath(lower.map(head.point)),
    upper: hullPath(upper.map(head.point)),
  };
};

/** A wing's points this frame (1 its left): folded or spread, raised or lowered on its stroke, the hand bent after the arm. */
const wingPoints = (bird: Lovebird, frame: Frame, side: 1 | -1) => {
  const { rig, wings } = bird;
  const preening = Math.cos(rig.heading.x) >= 0 === (side === 1) ? rig.preen.x : 0;
  // Drawn in a little through the upstroke; lifted a little to be preened under.
  const spread = Math.max(
    rig.spread.x * (1 - 0.35 * rig.amp.x * upstrokeAt(wings.phase)),
    0.35 * preening,
  );
  const arm = wings.arm + (0.9 - wings.arm) * preening;
  const hand = wings.hand.x + (0.9 - wings.hand.x) * preening;
  const wrist = side3(at(SPREAD, WRIST), side);
  const raise = rollOf(-side * arm);
  const bend = rollOf(-side * (hand - arm));
  const shoulder = side3(SHOULDER, side);
  return FOLDED.map((folded, index) => {
    const out = side3(at(SPREAD, index), side);
    const share = HAND_SHARE[index] ?? 0;
    const bent = add(wrist, apply(bend, sub(out, wrist)));
    const flexed = mix(out, bent, share);
    const spreadAt = add(shoulder, apply(raise, flexed));
    return frame.place(mix(side3(folded, side), spreadAt, spread));
  });
};

/** A wing: its outline, its flight feathers, and which side of it shows. */
const wingOf = (bird: Lovebird, frame: Frame, side: 1 | -1) => {
  const points = wingPoints(bird, frame, side);
  const seen = points.map(toScreen);
  const p = (index: number) => at(points, index);
  const s = (index: number) => seen[index] ?? { x: 0, y: 0 };
  const normal = scale(cross(sub(p(TIP), p(0)), sub(p(0), p(6))), side);
  const top = smooth(dot(normalize(normal), TOWARD_CAMERA) / 0.16 + 0.5);
  const along = (a: number, b: number, t: number) => mix(p(a), p(b), t);
  const quills = linesPath([
    [along(TIP, 3, 0.5), along(WRIST, TIP, 0.62)],
    [p(3), along(WRIST, TIP, 0.4)],
    [along(3, 4, 0.5), along(WRIST, TIP, 0.2)],
    [along(4, 5, 0.5), along(0, WRIST, 0.55)],
  ]);
  const depth = points.reduce((sum, point) => sum + depthOf(point), 0) / points.length;
  return {
    depth,
    hand: loopPath([s(WRIST), s(TIP), s(3), s(4)], new Set([1])),
    outline: loopPath(seen, new Set([TIP])),
    quills,
    top,
  };
};

/** Its tail's frame: its root, and which way it lies and fans (cocked up or down on its body). */
const tailFrameOf = (bird: Lovebird, frame: Frame) => {
  const cock = pitchOf(-0.12 + bird.rig.tail.x);
  const root = frame.placeSteady(TAIL_ROOT);
  const along = frame.turn(apply(cock, [-1, 0, 0]));
  return {
    cock,
    root,
    spine: [0, 1, 2, 3].map((index) => add(root, scale(along, (TAIL_LENGTH * index) / TAIL_LINKS))),
  };
};

/** Where its tail's chain hangs this frame, in the screen's pixels: from its root back along its tail. */
export const tailHangOf = (bird: Lovebird): Hang => {
  const { spine } = tailFrameOf(bird, frameOf(bird));
  return hangOf(spine.map(toScreen), { x: bird.x, y: bird.y }, SIZE);
};

/** How far its chain has carried each knot of its tail off where it lies (pixels on the screen), root to tip. */
const swingOf = (bird: Lovebird, spine: readonly Vec3[]): Point[] => {
  const knots = chainAbout(bird.tail, { x: bird.x, y: bird.y }, SIZE);
  if (knots.length !== spine.length) {
    return spine.map(() => ({ x: 0, y: 0 }));
  }
  return spine.map((rest, index) => {
    const seen = toScreen(rest);
    const knot = knots[index] ?? seen;
    return { x: knot.x - seen.x, y: knot.y - seen.y };
  });
};

/** The swing `t` of the way along its tail, between its chain's knots: the tail bends as its chain does. */
const swingAt = (swing: readonly Point[], t: number): Point => {
  const along = Math.max(0, Math.min(1, t)) * (swing.length - 1);
  const index = Math.min(swing.length - 2, Math.floor(along));
  const a = swing[index] ?? { x: 0, y: 0 };
  const b = swing[index + 1] ?? a;
  const k = along - index;
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
};

/** Lines on the screen, each its own stroke. */
const linesPathFlat = (lines: readonly (readonly Point[])[]) =>
  lines
    .map((line) =>
      line.map((p, index) => `${index === 0 ? "M" : "L"}${round(p.x)} ${round(p.y)}`).join(""),
    )
    .join("");

/** Its tail: one fan of feathers from its root, carried by its chain, scalloped at their tips. */
const tailOf = (bird: Lovebird, frame: Frame) => {
  const { cock, root, spine } = tailFrameOf(bird, frame);
  const swing = swingOf(bird, spine);
  const fan = bird.rig.fan.x;
  const spread = 0.3 + 1.7 * fan;
  const across = frame.turn(apply(cock, [0, 0, 1]));
  /** A point of the fan: `u` across it (-0.5 to 0.5 its outer feathers), `t` along a feather. */
  const fanAt = (u: number, t: number): Point => {
    const angle = u * spread;
    const direction = frame.turn(apply(cock, [-Math.cos(angle), 0, Math.sin(angle)]));
    const length = TAIL_LENGTH * (1 - 0.34 * Math.min(1, Math.abs(u) * 2) ** 2);
    // Its outer feathers lie a little under the middle ones, so it's never quite flat.
    const under = frame.turn(apply(cock, [0, -2.4 * Math.abs(u) * t, 0]));
    const seen = toScreen(
      add(add(add(root, scale(across, u * 2.6)), scale(direction, length * t)), under),
    );
    const carried = swingAt(swing, (t * length) / TAIL_LENGTH);
    return { x: seen.x + carried.x, y: seen.y + carried.y };
  };
  const us = Array.from({ length: FEATHERS }, (_, index) => index / (FEATHERS - 1) - 0.5);
  const edge = 0.5 + 0.4 / (FEATHERS - 1);
  const rim = us.flatMap((u, index) => {
    const next = us[index + 1];
    return next === undefined ? [fanAt(u, 1)] : [fanAt(u, 1), fanAt((u + next) / 2, 0.9)];
  });
  const outline = [fanAt(-edge, 0), fanAt(-edge, 0.8), ...rim, fanAt(edge, 0.8), fanAt(edge, 0)];
  const quills = linesPathFlat(
    us.slice(0, -1).map((u, index) => {
      const middle = (u + (us[index + 1] ?? u)) / 2;
      return [fanAt(middle, 0.4), fanAt(middle, 0.88)];
    }),
  );
  // The red at the base of its outer feathers, showing as they fan.
  const band = (from: number, to: number) =>
    loopPath(
      [fanAt(from, 0.32), fanAt(from, 0.64), fanAt(to, 0.62), fanAt(to, 0.34)],
      new Set([0, 1, 2, 3]),
    );
  return {
    band: band(-edge * 0.96, -0.28) + band(edge * 0.96, 0.28),
    banded: smooth((fan - 0.25) / 0.4),
    depth: depthOf(spine[1] ?? root),
    outline: loopPath(outline, new Set([0, outline.length - 1])),
    quills,
  };
};

/** A leg (1 its left): from its hip to its foot, tucked up, thrown forward or gripping the pointer, and its toes, two forward and two back. */
const legOf = (bird: Lovebird, frame: Frame, side: 1 | -1) => {
  const { rig } = bird;
  const hip = frame.place(side3(HIP, side));
  const tucked = frame.place(side3([HIP[0] - 2.5, HIP[1] - 0.5, HIP[2]], side));
  // Thrown forward and down to land, whichever way its body's pitched.
  const thrown = add(hip, apply(frame.yaw, [2.6, -5.2, 0.8 * side]));
  const grip = apply(frame.yaw, [0.6, 0, 2.1 * side]);
  const foot = mix(mix(tucked, thrown, rig.reach.x), grip, rig.legs.x);
  // Gripping, its toes curl down round the pointer's tip; tucked, they're clenched small.
  const open = 0.45 + 0.55 * Math.max(rig.legs.x, rig.reach.x);
  const curl = -0.9 * rig.legs.x;
  const toe = (x: number, z: number) => [
    foot,
    add(foot, apply(frame.yaw, [x * open, (curl - 0.3) * open, z * side])),
  ];
  return {
    // Tucked up into its belly feathers, a foot's behind its body.
    depth: depthOf(foot) - 2 - 30 * (1 - Math.max(rig.legs.x, rig.reach.x)),
    path:
      linePath([hip, foot]) +
      linesPath([toe(2.4, 0.7), toe(2, -0.4), toe(-2, 0.7), toe(-1.6, -0.3)]),
  };
};

/**
 * How near the camera each layer is this frame: what's nearer is drawn over
 * (`lovebird.ts` keeps the order, changing it only past a margin). Its head
 * is pushed further by how far it's off its body; a wing goes by
 * its middle, its tail by its first link, a leg by its foot.
 */
export const layerDepths = (bird: Lovebird): [string, number][] => {
  const frame = frameOf(bird);
  const body = depthOf(frame.center);
  const head = headOf(bird, frame);
  const headDepth = body + (depthOf(head.center) - body) * 1.4;
  const { root, spine } = tailFrameOf(bird, frame);
  return [
    ["body", body],
    ["head", headDepth],
    ["tail", depthOf(spine[1] ?? root)],
    ...([1, -1] as const).map((side, index): [string, number] => {
      const points = wingPoints(bird, frame, side);
      return [
        `wing-${index}`,
        points.reduce((sum, point) => sum + depthOf(point), 0) / points.length,
      ];
    }),
    ...([1, -1] as const).map((side, index): [string, number] => [
      `leg-${index}`,
      legOf(bird, frame, side).depth,
    ]),
  ];
};

export const lovebirdPose = (bird: Lovebird): Pose => {
  const frame = frameOf(bird);
  const body = bodyOf(bird, frame);
  const head = headOf(bird, frame);
  const beak = beakOf(bird, head);
  const wings = ([1, -1] as const).map((side) => wingOf(bird, frame, side));
  const tail = tailOf(bird, frame);
  const legs = ([1, -1] as const).map((side) => legOf(bird, frame, side));
  const headOutline = ellipseOf(head.center, axesOf(head.sphere));
  const headLit = solidPaths(headOutline).lit;
  const bodyLit = solidPaths(body.outline).lit;

  const parts = Object.fromEntries([
    ...solid("body", body.outline),
    ["rump", { d: body.rump }],
    ["rump-lit", { d: bodyLit }],
    ["tufts", { d: body.tufts }],
    ...solid("head", headOutline),
    ["head-tufts", { d: tuftsOf(headOutline, bird.rig.fluff.x * 0.8, 7, 1.1) }],
    ["face", { d: capPath(head.sphere, FACE_NORMAL, FACE_OFFSET) }],
    ["face-lit", { d: headLit }],
    ["brow", { d: capPath(head.sphere, BROW_NORMAL, BROW_OFFSET) }],
    ["brow-lit", { d: headLit }],
    ...eyesOf(bird, head),
    // Its beak drawn over its head while its tip's nearer the camera than its head's middle, else under it.
    ["beak-upper-front", { d: beak.front ? beak.upper : "" }],
    ["beak-lower-front", { d: beak.front ? beak.lower : "" }],
    ["beak-upper-back", { d: beak.front ? "" : beak.upper }],
    ["beak-lower-back", { d: beak.front ? "" : beak.lower }],
    ...wings.flatMap(({ hand, outline, quills, top }, index): [string, Part][] => [
      [`wing-${index}`, { d: outline }],
      [`wing-${index}-top`, { d: outline, opacity: round(top) }],
      [`hand-${index}`, { d: hand, opacity: round(top) }],
      [`quills-${index}`, { d: quills }],
    ]),
    ["tail", { d: tail.outline }],
    ["tail-quills", { d: tail.quills }],
    ["band", { d: tail.band, opacity: round(tail.banded) }],
    ...legs.map(({ path }, index) => [`leg-${index}`, { d: path }] as const),
  ]) satisfies Record<string, Part>;

  const crown = toScreen(head.center);
  return {
    at: { x: bird.x, y: bird.y },
    bubble: { x: crown.x, y: crown.y - head.r - 10 },
    order:
      bird.order.length > 0
        ? bird.order
        : layerDepths(bird)
            .toSorted((a, b) => a[1] - b[1])
            .map(([name]) => name),
    parts,
    say: bird.emotes.line,
  };
};
