// How the bunny (`bunny.ts`) looks this frame, built in the round and seen
// from a little above (`../follower/solid.ts`): a white rabbit's body, round
// at the rump and rising to its chest, a haunch on each side, its head with
// its eyes high on either side, a muzzle of two whisker pads under a pink
// nose, long ears lined pink, short forelegs, long hind feet and a cotton
// tail. Its hop: gathered on all fours, it pushes off its hind feet, stretches
// out in the air, lands on its forepaws (one just before the other) and
// swings its hind feet in to land ahead of them, bunched, ready to go again.
// Its ears and tail are chains (`../follower/chain.ts`) stepped in the
// behavior's step from where they hang at rest here (`hangsOf`): they stream
// back as it goes, flop as it lands and swing back up when it stops. Each part
// is a layer stacked by how near the camera it is. In its own pixels: x
// forward, y up, z to its left, its feet at the origin. Pure.
import type { Chain, Hang, Point } from "../follower/chain";
import type { Part, Pose } from "../follower/creature";
import type { Ellipse, Ellipsoid, Mat3, Vec3 } from "../follower/solid";
import type { Bunny } from "./bunny";
import { round } from "../art";
import { chainAbout, hangOf } from "../follower/chain";
import {
  add,
  apply,
  compose,
  cross,
  curveOf,
  depthOf,
  dot,
  ellipseOf,
  ellipsePath,
  hullPath,
  linePath,
  linesPath,
  normalize,
  PITCH,
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

const TORSO: Vec3 = [-2.4, 8.4, 0];
const TORSO_RADII: Vec3 = [9.6, 7.4, 7];
const CHEST: Vec3 = [3.8, 9.4, 0];
const CHEST_RADII: Vec3 = [5.6, 7, 5.8];
const HAUNCH: Vec3 = [-6.2, 6, 4.4];
const HAUNCH_RADII: Vec3 = [5.8, 5.6, 3.3];
/** Where its head turns and nods about, and its head about that. */
const NECK: Vec3 = [5.4, 13.6, 0];
const HEAD: Vec3 = [3.4, 4.4, 0];
const HEAD_RADII: Vec3 = [6.4, 5.5, 5];
/** Its whisker pads, either side under its nose, about its head. */
const PAD: Vec3 = [5, -2.3, 1.45];
const PAD_RADII: Vec3 = [2.3, 2.1, 1.9];
const NOSE: Vec3 = [6.9, -0.9, 0];
/** Its eyes: which way from its head's middle, and how big. */
const EYE: Vec3 = [0.42, 0.34, 0.84];
const EYE_R = 1.75;
/** Its ears: rooted in the top of its head, each this long, in this many links. */
const EAR_ROOT: Vec3 = [-1.6, 4, 1.9];
export const EAR_LINKS = 4;
const EAR_LENGTH = 17;
/** How much each link of an ear curves back on the one before, and how far the floppier one's tip folds out. */
const EAR_CURL = 0.07;
const EAR_FOLD = 0.2;
const EAR_WIDTH = 2.75;
/** Its tail, at the top of its rump, and how far it sticks out. */
const TAIL: Vec3 = [-11.4, 9.6, 0];
const TAIL_OUT = 2.6;
export const TAIL_R = 3.1;
/** Its hind feet (toes at rest under its belly, heels under its haunches), and its forepaws. */
const HIND = { length: 7.6, rest: 0.6, side: 3.9 } as const;
const FORE = { rest: 7.6, side: 2.3 } as const;
const HIP: Vec3 = [-6.6, 4.2, 3.9];
const SHOULDER: Vec3 = [5, 5.4, 2.3];
/** Its hind feet kicked out behind in a binky: soles up, toes trailing. */
const KICKED = 2.85;
/** What it pitches about: over its hind feet. And the middle it squashes and stretches about. */
const PIVOT: Vec3 = [-3.5, 2.5, 0];
const MIDDLE: Vec3 = [-1, 8, 0];
/** How far it rears up, sat up tall. */
const REAR = 0.78;
/** A hop's full stride (pixels), and its highest. */
const FULL_STRIDE = 26;
const MOST_HOP = 10;
/** Strides past which its feet are down a shorter share of each hop: it bounds. */
const BOUND_STRIDE = 70;
/** When in a hop: its hind feet leave the ground and its body's in the air; its forepaws land; its hind feet land. */
const AIRBORNE = 0.16;
const AIR_S = 0.48;
const FORE_LAND = [0.55, 0.585] as const;
const FORE_STANCE = 0.5;
const HIND_LAND = 0.8;
const HIND_STANCE = 0.48;
/** Where the light comes from, as `solid.ts` has it: an ear's lit side is moved toward it. */
const LIGHT = { x: -0.55, y: -0.83 };

/** No shift: a part drawn where it is. */
const UNMOVED: Point = { x: 0, y: 0 };

/** How much a surface's way faces the camera, -1 turned straight away to 1 straight at it: not clamped, so a turned-away part never shows. */
const toward = (way: Vec3) => dot(normalize(way), TOWARD_CAMERA);

const fraction = (t: number) => ((t % 1) + 1) % 1;

/** How far through a span of the hop `t` is, 0 to 1, the span running round past 1; -1 outside it. */
const spanOf = (t: number, from: number, length: number) => {
  const into = fraction(t - from);
  return into < length ? into / length : -1;
};

/** Where it is in its hop this frame: its body's lift, pitch and stretch, and how big a hop. */
export const hopOf = (bunny: Bunny) => {
  const t = fraction(bunny.hop);
  const stride = Math.max(0, bunny.rig.stride.x);
  const amount = Math.min(1, stride / FULL_STRIDE);
  const height = Math.min(MOST_HOP, stride * 0.34);
  const air = spanOf(t, AIRBORNE, AIR_S);
  const ground = spanOf(t, AIRBORNE + AIR_S, 1 - AIR_S);
  // Up in the air; down on the ground, bunched, ready to push off again.
  const lift =
    air >= 0 ? height * Math.sin(Math.PI * air) : -0.16 * height * Math.sin(Math.PI * ground);
  return {
    amount,
    height,
    lift,
    // Nose up as it pushes off, down as it lands on its forepaws.
    pitch: 0.2 * amount * Math.cos(Math.PI * 2 * (t - 0.22)),
    // Faster, it bounds: longer in the air, its feet down a shorter share of each hop.
    stance: {
      fore: FORE_STANCE - 0.22 * smooth((stride - FULL_STRIDE) / (BOUND_STRIDE - FULL_STRIDE)),
      hind: HIND_STANCE - 0.24 * smooth((stride - FULL_STRIDE) / (BOUND_STRIDE - FULL_STRIDE)),
    },
    // Stretched out in the air, bunched up landing.
    stretch: 0.16 * amount * Math.sin(Math.PI * 2 * (t - 0.06)),
    stride,
    t,
  };
};

/** Where its hind feet's stance is centered: forward of where they stand, as it bounds, so they land ahead of its forepaws. */
const hindCenterOf = (hop: Hop) => HIND.rest + Math.min(0.16 * hop.stride, 5);

type Hop = ReturnType<typeof hopOf>;

/**
 * A foot in its hop, along the ground about where it stands at rest: on the
 * ground from `land`, for `stance` of the hop, going back under it as it goes
 * over (as far as it goes, so it never slips); then up and swung forward.
 */
const stepOf = (hop: Hop, land: number, stance: number, center: number) => {
  const half = (hop.stride * stance) / 2;
  const planted = spanOf(hop.t, land, stance);
  if (planted >= 0) {
    return { planted, swing: -1, x: center + half - planted * hop.stride * stance };
  }
  const swing = spanOf(hop.t, land + stance, 1 - stance);
  return { planted: -1, swing, x: center - half + 2 * half * smooth(swing) };
};

/** Its frame this frame: how a point or a direction of its body is placed in the world. */
const frameOf = (bunny: Bunny) => {
  const { rig } = bunny;
  const hop = hopOf(bunny);
  const stand = rig.stand.x;
  const low = 1.8 * rig.doze.x + 0.9 * rig.content.x;
  const pitch = hop.pitch + REAR * stand - 0.24 * rig.sniff.x - 0.2 * rig.stamp.x + rig.pitch.x;
  const body: Mat3 = compose(pitchOf(pitch), rollOf(rig.roll.x));
  const yaw = yawOf(rig.heading.x + rig.twist.x);
  const lift = hop.lift + rig.lift.x + 1.2 * stand + 1.4 * rig.stamp.x - low;
  // Squashed and stretched along its length, keeping its bulk; flatter dozing, a loaf.
  const long = 1 + bunny.squash.x - 0.06 * rig.doze.x;
  const thin = 1 / Math.sqrt(long);
  const stretched = (local: Vec3): Vec3 => [
    MIDDLE[0] + (local[0] - MIDDLE[0]) * long,
    MIDDLE[1] + (local[1] - MIDDLE[1]) * thin,
    local[2] * Math.sqrt(thin),
  ];
  const turn = (direction: Vec3): Vec3 => apply(yaw, apply(body, direction));
  const place = (local: Vec3): Vec3 =>
    add(apply(yaw, add(apply(body, sub(stretched(local), PIVOT)), PIVOT)), [0, lift, 0]);
  // Its haunches go with its hind feet: drawn up under it landing, stretched back pushing off.
  const hind = stepOf(hop, HIND_LAND, hop.stance.hind, hindCenterOf(hop));
  const bunch = Math.max(-3, Math.min(4, 0.45 * (hind.x - HIND.rest)));
  return { bunch, hop, lift, long, pitch, place, thin, turn, yaw };
};

type Frame = ReturnType<typeof frameOf>;

/** Its head: where it is, and its own turn and nod, holding it near level as its body pitches. */
const headOf = (bunny: Bunny, frame: Frame) => {
  const { rig } = bunny;
  const own: Mat3 = compose(yawOf(rig.look.x), pitchOf(rig.nod.x - frame.pitch * 0.75));
  const direction = (local: Vec3) => frame.turn(apply(own, local));
  const at = add(frame.place(NECK), direction(HEAD));
  const point = (local: Vec3) => add(at, direction(local));
  return { at, direction, point };
};

type Head = ReturnType<typeof headOf>;

/** Where a ray from an ellipsoid's middle meets its surface, and the surface's normal there. */
const surfaceOf = (radii: Vec3, way: Vec3) => {
  const u = normalize(way);
  const reach = 1 / Math.hypot(u[0] / radii[0], u[1] / radii[1], u[2] / radii[2]);
  return {
    at: scale(u, reach),
    normal: normalize([u[0] / radii[0] ** 2, u[1] / radii[1] ** 2, u[2] / radii[2] ** 2]),
  };
};

const axesOf = (radii: Vec3, turn: (v: Vec3) => Vec3): Vec3[] => [
  turn([radii[0], 0, 0]),
  turn([0, radii[1], 0]),
  turn([0, 0, radii[2]]),
];

/** How near the camera a point is going round it, not up: for parts that sit on another. */
const roundOf = (v: Vec3) => depthOf([v[0], 0, v[2]]);

// Its ears.

/** Where an ear (1 its left) lies at rest, in its head's own pixels, root to tip; and its inside's way. */
const earRestOf = (bunny: Bunny, side: 1 | -1) => {
  const { rig } = bunny;
  // Its left ear stands a little straighter; its right is the floppier, its tip folding out.
  const lay = rig.lay.x + (side === 1 ? -0.06 : 0.18);
  const splay = 0.24 + 0.2 * Math.max(0, rig.lay.x);
  let at: Vec3 = [EAR_ROOT[0], EAR_ROOT[1], EAR_ROOT[2] * side];
  const points: Vec3[] = [at];
  let middle: Mat3 = pitchOf(lay);
  for (let link = 0; link < EAR_LINKS; link += 1) {
    const fold = side === -1 ? EAR_FOLD * smooth(link - 1.5) : 0;
    const bend = compose(rollOf(side * (splay + fold)), pitchOf(lay + EAR_CURL * link));
    if (link === 1) {
      middle = bend;
    }
    at = add(at, apply(bend, [0, EAR_LENGTH / EAR_LINKS, 0]));
    points.push(at);
  }
  // Its inside faces forward and out; laid back, it turns out and down, as a rabbit's does folded flat.
  const back = Math.max(0, lay);
  const inside = apply(
    compose(rollOf(side * splay), pitchOf(-0.5 * back)),
    normalize([1, 0, (0.85 + back) * side]),
  );
  return { inside, middle, points };
};

/** Where its ears and tail hang at rest this frame, on the screen: the chains' roots and shapes. */
export const hangsOf = (bunny: Bunny) => {
  const frame = frameOf(bunny);
  const head = headOf(bunny, frame);
  const origin = { x: bunny.walker.x, y: bunny.walker.y };
  const earHang = (side: 1 | -1) =>
    hangOf(
      earRestOf(bunny, side).points.map((local) => toScreen(head.point(local))),
      origin,
    );
  const ears: [Hang, Hang] = [earHang(1), earHang(-1)];
  const tailUp = bunny.rig.tail.x;
  const tail = hangOf(
    [TAIL, add(TAIL, scale(normalize([-1, 0.5 + tailUp, 0]), TAIL_OUT))].map((local) =>
      toScreen(frame.place(local)),
    ),
    origin,
  );
  return { ears, tail };
};

/** A smooth line through a chain's points: Catmull-Rom, a few pieces a link. */
const smoothLine = (points: readonly Point[], pieces = 4): Point[] => {
  const at = (index: number): Point => {
    const first = points[0] ?? { x: 0, y: 0 };
    const last = points.at(-1) ?? first;
    if (index < 0) {
      const next = points[1] ?? first;
      return { x: 2 * first.x - next.x, y: 2 * first.y - next.y };
    }
    if (index >= points.length) {
      const before = points.at(-2) ?? last;
      return { x: 2 * last.x - before.x, y: 2 * last.y - before.y };
    }
    return points[index] ?? first;
  };
  const line: Point[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const [a, b, c, d] = [at(index - 1), at(index), at(index + 1), at(index + 2)];
    for (let piece = 0; piece < pieces; piece += 1) {
      const t = piece / pieces;
      const t2 = t * t;
      const t3 = t2 * t;
      const blend = (p: number, q: number, r: number, s: number) =>
        0.5 *
        (2 * q + (r - p) * t + (2 * p - 5 * q + 4 * r - s) * t2 + (3 * q - p - 3 * r + s) * t3);
      line.push({ x: blend(a.x, b.x, c.x, d.x), y: blend(a.y, b.y, c.y, d.y) });
    }
  }
  const tip = points.at(-1);
  if (tip) {
    line.push(tip);
  }
  return line;
};

/** An ear's half width along it, 0 at its root to 1 at its tip: narrow at the root, widest a third up, tapering to a round tip. */
const earWidthAt = (u: number) =>
  u < 0.35 ? 0.62 + 0.38 * smooth(u / 0.35) : 1 - 0.5 * smooth((u - 0.35) / 0.65);

const polygon = (points: readonly Point[]) =>
  points.length < 3
    ? ""
    : `${points.map((p, index) => `${index === 0 ? "M" : "L"}${round(p.x)} ${round(p.y)}`).join("")}Z`;

/** A leaf round a line, `widthAt` its half width along it, its tip rounded. */
const leafOf = (line: readonly Point[], widthAt: (u: number) => number, shift: Point = UNMOVED) => {
  const left: Point[] = [];
  const right: Point[] = [];
  let tipNormal = { x: 0, y: 0 };
  let tipTangent = { x: 0, y: -1 };
  for (const [index, p] of line.entries()) {
    const before = line[index - 1] ?? p;
    const after = line[index + 1] ?? p;
    const length = Math.hypot(after.x - before.x, after.y - before.y) || 1;
    const tangent = { x: (after.x - before.x) / length, y: (after.y - before.y) / length };
    const normal = { x: -tangent.y, y: tangent.x };
    const width = widthAt(index / (line.length - 1));
    left.push({ x: p.x + normal.x * width + shift.x, y: p.y + normal.y * width + shift.y });
    right.push({ x: p.x - normal.x * width + shift.x, y: p.y - normal.y * width + shift.y });
    tipNormal = { x: normal.x * width, y: normal.y * width };
    tipTangent = { x: tangent.x * widthAt(1), y: tangent.y * widthAt(1) };
  }
  const tip = line.at(-1) ?? { x: 0, y: 0 };
  // Round the tip: a half circle from one side to the other.
  const cap = Array.from({ length: 7 }, (_, index) => {
    const angle = ((index + 1) / 8) * Math.PI;
    return {
      x: tip.x + shift.x + tipNormal.x * Math.cos(angle) + tipTangent.x * Math.sin(angle),
      y: tip.y + shift.y + tipNormal.y * Math.cos(angle) + tipTangent.y * Math.sin(angle),
    };
  });
  return polygon([...left, ...cap, ...right.toReversed()]);
};

/** How near the camera an ear is, about its head: before it turned to the camera, over it turned away, more so laid back toward the camera. */
const earDepthOf = (bunny: Bunny, head: Head, side: 1 | -1) => {
  const { points } = earRestOf(bunny, side);
  const root = head.point(points[0] ?? EAR_ROOT);
  const middle = head.point(points[2] ?? EAR_ROOT);
  return roundOf(sub(root, head.at)) * 2.5 + Math.max(0, roundOf(sub(middle, root))) * 0.8;
};

/** An ear (1 its left) drawn along its chain: its back, its lit side, its pink inside as far as it faces the camera. */
const earOf = (bunny: Bunny, head: Head, chain: Chain, side: 1 | -1) => {
  const rest = earRestOf(bunny, side);
  const root = head.point(rest.points[0] ?? EAR_ROOT);
  const rootSeen = toScreen(root);
  // The chain about the ear's root as it is now: a frame too short to step the chain leaves it where it was.
  const knots = chainAbout(chain, { x: 0, y: 0 });
  const first = knots[0] ?? { x: 0, y: 0 };
  const points = knots.map((knot) => ({
    x: knot.x - first.x + rootSeen.x,
    y: knot.y - first.y + rootSeen.y,
  }));
  const line = smoothLine(points);
  // How wide it looks: its blade turned edge on is narrow, though never thinner than its cup.
  const inside = head.direction(rest.inside);
  const along = head.direction(apply(rest.middle, [0, 1, 0]));
  const across = toScreen(normalize(cross(along, inside)));
  const tip = points.at(-1) ?? rootSeen;
  const length = Math.hypot(tip.x - rootSeen.x, tip.y - rootSeen.y) || 1;
  const way = { x: (tip.x - rootSeen.x) / length, y: (tip.y - rootSeen.y) / length };
  const broad = Math.max(0.45, Math.min(1, Math.abs(way.x * across.y - way.y * across.x)));
  const width = (u: number) => EAR_WIDTH * broad * earWidthAt(u);
  const lining = (u: number) => width(u) * 0.52 * smooth(u / 0.18);
  // Laid flat, its insides are hidden under it.
  const shown =
    smooth((toward(inside) - 0.04) / 0.3) * (1 - smooth((bunny.rig.lay.x - 0.45) / 0.5));
  const lit = EAR_WIDTH * broad * 0.55;
  const tipAt = head.point(rest.points.at(-1) ?? EAR_ROOT);
  return {
    // Before its head turned to the camera, over it turned away; over its back, laid back toward the camera.
    depth: earDepthOf(bunny, head, side),
    lining: { d: leafOf(line.slice(1), lining), opacity: round(shown) },
    tip: toScreen(tipAt),
    whole: leafOf(line, width),
    wholeLit: leafOf(line, width, { x: LIGHT.x * lit, y: LIGHT.y * lit }),
  };
};

// Its head's face.

/** Its eyes: dark, high on either side of its head, a glint in each; shut in a curve, dozing or content. */
const eyesOf = (bunny: Bunny, head: Head) => {
  const shut = Math.max(bunny.rig.doze.x, bunny.rig.content.x);
  return ([1, -1] as const).flatMap((side, index) => {
    const { at, normal } = surfaceOf(HEAD_RADII, [EYE[0], EYE[1], EYE[2] * side]);
    const world = head.direction(normal);
    const center = head.point(add(at, scale(normal, 0.15)));
    const [u, v] = tangentsOf(world);
    const shown = smooth((toward(world) - 0.04) / 0.22);
    const up = head.direction([0, 1, 0]);
    const ahead = head.direction([1, 0, 0]);
    const glint = add(center, add(scale(up, 0.6), scale(ahead, 0.55)));
    const lid = curveOf(
      add(center, scale(ahead, 1.6)),
      add(center, scale(up, -1.1)),
      add(center, scale(ahead, -1.6)),
      4,
    );
    return [
      [
        `eye-${index}`,
        {
          d: ellipsePath(ellipseOf(center, [scale(u, EYE_R), scale(v, EYE_R)])),
          opacity: round(shown * (1 - shut)),
        },
      ],
      [
        `glint-${index}`,
        {
          d: ellipsePath(ellipseOf(glint, [scale(u, 0.5), scale(v, 0.5)])),
          opacity: round(shown * (1 - shut)),
        },
      ],
      [`lid-${index}`, { d: linePath(lid), opacity: round(shown * smooth(shut * 1.4 - 0.2)) }],
    ] as const;
  });
};

/** Its muzzle: two whisker pads, a pink nose twitching over them, its mouth, and whiskers out either side. */
const muzzleOf = (bunny: Bunny, head: Head) => {
  const twitch = Math.abs(Math.sin(bunny.twitch * 9)) * (0.25 + 0.75 * bunny.rig.sniff.x);
  const pads = ([1, -1] as const).map((side) => {
    const center = head.point([PAD[0], PAD[1] + 0.25 * twitch, PAD[2] * side]);
    return { center, outline: ellipseOf(center, axesOf(PAD_RADII, head.direction)) };
  });
  // Turned away, its pads are behind its head: gone, so they don't show through it.
  const padsShown = smooth((toward(head.direction([1, -0.2, 0])) + 0.4) / 0.3);
  const nose = (x: number, y: number, z: number) =>
    head.point([NOSE[0] + x, NOSE[1] + y * (1 + 0.35 * twitch), z]);
  const bottom = nose(0.1, -0.7, 0);
  const whiskers = ([1, -1] as const).flatMap((side) =>
    [
      [0.8, 0.9],
      [1.4, -0.3],
      [0.6, -1.6],
    ].map(([out = 0, rise = 0]) => {
      const from = head.point([PAD[0] + 0.4, PAD[1] + 0.2, (PAD[2] + 1.2) * side]);
      return [from, head.point([PAD[0] + 2.6 + out, PAD[1] + rise + 0.4, (PAD[2] + 5.2) * side])];
    }),
  );
  return {
    center: head.point([PAD[0], PAD[1], 0]),
    mouth: linesPath([
      [bottom, head.point([6.5, -2.9, 0])],
      [head.point([6.5, -2.9, 0]), head.point([6, -3.4, 1])],
      [head.point([6.5, -2.9, 0]), head.point([6, -3.4, -1])],
    ]),
    nose: hullPath([nose(0, 0.5, 0.95), nose(0, 0.5, -0.95), nose(0.25, 0.65, 0), bottom]),
    pads,
    padsShown,
    whiskers: linesPath(whiskers),
  };
};

// Its feet.

/** A hind foot (1 its left): its toe in its hop, its heel lifting as it pushes off, trailing behind in the air. */
const hindOf = (bunny: Bunny, frame: Frame, side: 1 | -1) => {
  const { hop } = frame;
  const { rig } = bunny;
  const step = stepOf(hop, HIND_LAND, hop.stance.hind, hindCenterOf(hop));
  // Its heel: down flat, rising as it pushes off, then up behind as its leg stretches out, and down to land.
  let angle = 0;
  let height = 0;
  if (step.planted > 0.62) {
    angle = 0.9 * smooth((step.planted - 0.62) / 0.38);
  } else if (step.swing >= 0) {
    const u = step.swing;
    angle = u < 0.35 ? 0.9 + 1.2 * smooth(u / 0.35) : 2.1 * (1 - smooth((u - 0.35) / 0.5));
    height = Math.max(0, frame.hop.lift * 0.9 + 1.6 * Math.sin(Math.PI * u));
  }
  angle *= hop.amount;
  const stamp = rig.stamp.x;
  const kick = rig.kick.x;
  // A thump lifts its heels and brings them down hard; a binky kicks its feet out behind.
  angle = (angle + 0.6 * stamp) * (1 - kick) + KICKED * kick;
  const toe: Vec3 = [
    step.x - 11 * kick,
    height + 1.6 * stamp + rig.lift.x * 0.92 + 4 * kick,
    side * (HIND.side + 3.4 * kick),
  ];
  const heel = add(toe, [-HIND.length * Math.cos(angle), HIND.length * Math.sin(angle), 0]);
  return { heel: apply(frame.yaw, heel), toe: apply(frame.yaw, toe) };
};

/** A forepaw (1 its left): on the ground stepping, reaching out to land; up in front of its chest, sat up or grooming. */
const foreOf = (bunny: Bunny, frame: Frame, head: Head, side: 1 | -1, index: number) => {
  const { hop } = frame;
  const { rig } = bunny;
  const step = stepOf(
    hop,
    FORE_LAND[index] ?? FORE_LAND[0],
    hop.stance.fore,
    FORE.rest - Math.min(0.1 * hop.stride, 3),
  );
  const height =
    step.swing >= 0 ? Math.max(0, frame.hop.lift * 0.8 + 1.4 * Math.sin(Math.PI * step.swing)) : 0;
  const ground = apply(frame.yaw, [step.x, height + rig.lift.x * 0.92, side * FORE.side]);
  // Up off the ground: hanging in front of its chest sat up, or rubbing its face.
  const hanging = frame.place([7.6, 3.6, side * 2]);
  const scrub = Math.sin(bunny.time * 11 + index * 1.2) * 1.4;
  const face = head.point([3.6, -3.4 + scrub, side * 2.1]);
  const groom = rig.groom.x;
  const up = Math.max(rig.stand.x, groom, smooth(rig.lift.x / 6));
  const raised = add(scale(hanging, 1 - groom), scale(face, groom));
  return add(scale(ground, 1 - up), scale(raised, up));
};

const solid = (name: string, outline: Ellipse): [string, Part][] => {
  const { lit, whole } = solidPaths(outline);
  return [
    [name, { d: whole }],
    [`${name}-lit`, { d: lit }],
  ];
};

/** A circle of points about a limb's end, square to the camera, so it's round on the screen. */
const ringOf = (center: Vec3, r: number) =>
  Array.from({ length: 12 }, (_, index): Vec3 => {
    const angle = (index / 12) * Math.PI * 2;
    return add(center, [
      r * Math.cos(angle),
      -r * Math.sin(angle) * Math.cos(PITCH),
      r * Math.sin(angle) * Math.sin(PITCH),
    ]);
  });

/** A leg seen from the camera: the outline round a round end at each joint, thick at the top and tapering. */
const limbPath = (from: Vec3, fromR: number, to: Vec3, toR: number) =>
  hullPath([...ringOf(from, fromR), ...ringOf(to, toR)]);

/** A foot or a paw: a flattened solid from heel to toe, `width` across and `height` thick. */
const footSolid = (from: Vec3, to: Vec3, width: number, height: number, frame: Frame) => {
  const along = scale(sub(to, from), 0.5);
  const flat = cross([0, 1, 0], along);
  // Pointing straight down (a foot kicked out), it's across its heading.
  const across =
    Math.hypot(flat[0], flat[1], flat[2]) > 1e-3 ? normalize(flat) : apply(frame.yaw, [0, 0, 1]);
  const up = normalize(cross(along, across));
  return ellipseOf(scale(add(from, to), 0.5), [along, scale(up, height), scale(across, width)]);
};

/** A cotton tail: a round puff, its edge in little scallops. */
const puffPath = (center: Point, r: number, shift: Point = UNMOVED) => {
  const bumps = 7;
  const at = (k: number) => {
    const angle = (k / bumps) * Math.PI * 2 + 0.3;
    return {
      x: center.x + shift.x + r * Math.cos(angle),
      y: center.y + shift.y + r * Math.sin(angle),
    };
  };
  const bump = round(r * 0.5);
  const start = at(0);
  let d = `M${round(start.x)} ${round(start.y)}`;
  for (let k = 1; k <= bumps; k += 1) {
    const p = at(k);
    d += `A${bump} ${bump} 0 0 1 ${round(p.x)} ${round(p.y)}`;
  }
  return `${d}Z`;
};

/** Its body: its torso and chest, squashed and stretched, its haunches either side. */
const bodyOf = (frame: Frame) => {
  const stretch = (radii: Vec3): Vec3 => [
    radii[0] * frame.long,
    radii[1] * frame.thin,
    radii[2] * Math.sqrt(frame.thin),
  ];
  const torso = frame.place(TORSO);
  const chest = frame.place(CHEST);
  const haunches = ([1, -1] as const).map((side) => {
    const center = frame.place([HAUNCH[0] + frame.bunch, HAUNCH[1], HAUNCH[2] * side]);
    return { center, outline: ellipseOf(center, axesOf(stretch(HAUNCH_RADII), frame.turn)) };
  });
  return {
    chest: ellipseOf(chest, axesOf(stretch(CHEST_RADII), frame.turn)),
    haunches,
    solids: [
      { center: torso, radii: stretch(TORSO_RADII), turn: frame.turn },
      { center: chest, radii: stretch(CHEST_RADII), turn: frame.turn },
    ] satisfies Ellipsoid[],
    torso: ellipseOf(torso, axesOf(stretch(TORSO_RADII), frame.turn)),
    torsoAt: torso,
  };
};

// What's in front of what.

/**
 * How far a point is in front of a solid's near side, along the camera's line
 * through it (negative behind it); null if the line misses the solid, so
 * they don't overlap on the screen.
 */
const aheadOf = (point: Vec3, { center, radii, turn }: Ellipsoid) => {
  // In the solid's own axes, scaled to a unit sphere: the point, and the camera's way.
  const [ax, ay, az] = [turn([1, 0, 0]), turn([0, 1, 0]), turn([0, 0, 1])];
  const unit = (v: Vec3): Vec3 => [
    dot(ax, v) / radii[0],
    dot(ay, v) / radii[1],
    dot(az, v) / radii[2],
  ];
  const q = unit(sub(point, center));
  const e = unit(TOWARD_CAMERA);
  const a = dot(e, e);
  const b = 2 * dot(q, e);
  const c = dot(q, q) - 1;
  const crossing = b * b - 4 * a * c;
  return crossing < 0 ? null : (b - Math.sqrt(crossing)) / (2 * a);
};

/** How far a point must be past a solid's side to change which side it's drawn: so a part doesn't flicker over and under as it passes. */
const SETTLED = 0.8;

/** Whether a point's in front of some solids: of every one it overlaps; kept as it was until it's clearly crossed. */
/** Whether a measure that's positive on one side has it there: kept as it was until it's past `band` the other way. */
const steady = (was: boolean | undefined, margin: number, band: number) => {
  if (was === undefined) {
    return margin > 0;
  }
  return was ? margin > -band : margin > band;
};

/** Which side of its body its haunches and tail show, by which way they face: a band so a hop's pitch can't flip them. */
const FACING_BAND = 0.15;
/** A hind foot passes under its body every hop: it must be well past its side to change. */
const FOOT_BAND = 2.5;
/** Its haunches' and its tail's ways out from its body. */
const HAUNCH_OUT: Vec3 = [-0.6, 0, 0.8];
const TAIL_OUT_WAY: Vec3 = [-1, 0.4, 0];
/** How far a layer drawn over or under its body sits from it, in the stacking. */
const OVER = { ear: 0.3, fore: 0.6, haunch: 1, hind: 0.5, tail: 1.2 } as const;

const sideOf = (
  point: Vec3,
  solids: readonly Ellipsoid[],
  was: boolean | undefined,
  otherwise: boolean,
  band = SETTLED,
) => {
  const margins = solids.map((one) => aheadOf(point, one)).filter((margin) => margin !== null);
  if (margins.length === 0) {
    return was ?? otherwise;
  }
  const margin = Math.min(...margins);
  if (was === undefined) {
    return margin > 0;
  }
  return was ? margin > -band : margin > band;
};

/** Which of its parts are in front of its body (and its paws of its head) this frame, for the behavior to keep. */
export const sidesOf = (bunny: Bunny): Record<string, boolean> => {
  const frame = frameOf(bunny);
  const head = headOf(bunny, frame);
  const body = bodyOf(frame);
  const was = bunny.sides;
  const torsoDepth = depthOf(body.torsoAt);
  const headSolid: Ellipsoid = { center: head.at, radii: HEAD_RADII, turn: head.direction };
  const entries: [string, boolean][] = [];
  for (const [index, side] of ([1, -1] as const).entries()) {
    const { heel, toe } = hindOf(bunny, frame, side);
    const foot = scale(add(heel, toe), 0.5);
    const paw = foreOf(bunny, frame, head, side, index);
    const ear = head.point(earRestOf(bunny, side).points[2] ?? EAR_ROOT);
    // Its ear over its body where they overlap by which is in front; else by its depth, steadily.
    const earAbove = steady(
      was[`ear-${index}`],
      depthOf(head.at) + earDepthOf(bunny, head, side) - torsoDepth,
      SETTLED,
    );
    entries.push(
      [
        `hind-${index}`,
        sideOf(foot, body.solids, was[`hind-${index}`], depthOf(foot) > torsoDepth, FOOT_BAND),
      ],
      [`fore-${index}`, sideOf(paw, body.solids, was[`fore-${index}`], depthOf(paw) > torsoDepth)],
      [`fore-${index}-head`, sideOf(paw, [headSolid], was[`fore-${index}-head`], false)],
      [`ear-${index}`, sideOf(ear, body.solids, was[`ear-${index}`], earAbove)],
      [
        `haunch-${index}`,
        steady(
          was[`haunch-${index}`],
          toward(frame.turn([HAUNCH_OUT[0], HAUNCH_OUT[1], HAUNCH_OUT[2] * side])),
          FACING_BAND,
        ),
      ],
    );
  }
  entries.push(["tail", steady(was.tail, toward(frame.turn(TAIL_OUT_WAY)), FACING_BAND)]);
  return Object.fromEntries(entries);
};

export const bunnyPose = (bunny: Bunny): Pose => {
  const frame = frameOf(bunny);
  const head = headOf(bunny, frame);
  const body = bodyOf(frame);
  const muzzle = muzzleOf(bunny, head);
  const ears = ([1, -1] as const).map((side, index) =>
    earOf(bunny, head, bunny.ears[index] ?? bunny.ears[0], side),
  );
  const hinds = ([1, -1] as const).map((side) => hindOf(bunny, frame, side));
  const fores = ([1, -1] as const).map((side, index) => foreOf(bunny, frame, head, side, index));
  // The tail at its chain's tip, about where its root is now.
  const tailKnots = chainAbout(bunny.tail, { x: 0, y: 0 });
  const tailRoot = frame.place(TAIL);
  const tailSeen = toScreen(tailRoot);
  const tailTip = tailKnots.at(-1) ?? tailSeen;
  const tailFirst = tailKnots[0] ?? tailSeen;
  const tailAt = {
    x: tailTip.x - tailFirst.x + tailSeen.x,
    y: tailTip.y - tailFirst.y + tailSeen.y,
  };
  const tailLit = TAIL_R * 0.3;

  const parts = Object.fromEntries([
    ...solid("torso", body.torso),
    ...solid("chest", body.chest),
    ...body.haunches.flatMap(({ outline }, index) => solid(`haunch-${index}`, outline)),
    ...solid("head", ellipseOf(head.at, axesOf(HEAD_RADII, head.direction))),
    ...eyesOf(bunny, head),
    ...muzzle.pads.flatMap(({ outline }, index): [string, Part][] =>
      solid(`pad-${index}`, outline).map(([name, part]) => [
        name,
        { ...part, opacity: round(muzzle.padsShown) },
      ]),
    ),
    ["nose", { d: muzzle.nose }],
    ["mouth", { d: muzzle.mouth }],
    ["whiskers", { d: muzzle.whiskers }],
    ...ears.flatMap(({ lining, whole, wholeLit }, index): [string, Part][] => [
      [`ear-${index}`, { d: whole }],
      [`ear-${index}-lit`, { d: wholeLit }],
      [`lining-${index}`, lining],
    ]),
    ["tail", { d: puffPath(tailAt, TAIL_R) }],
    ["tail-lit", { d: puffPath(tailAt, TAIL_R, { x: LIGHT.x * tailLit, y: LIGHT.y * tailLit }) }],
    ...hinds.flatMap(({ heel, toe }, index): [string, Part][] => [
      [
        `hind-leg-${index}`,
        {
          d: limbPath(
            frame.place([HIP[0] + frame.bunch, HIP[1], HIP[2] * (index === 0 ? 1 : -1)]),
            2.7,
            add(heel, [0, 1, 0]),
            1.3,
          ),
        },
      ],
      ...solid(`hind-${index}`, footSolid(heel, toe, 1.7, 1.3, frame)),
    ]),
    ...fores.flatMap((paw, index): [string, Part][] => {
      const shoulder = frame.place([
        SHOULDER[0],
        SHOULDER[1],
        SHOULDER[2] * (index === 0 ? 1 : -1),
      ]);
      const ahead = apply(frame.yaw, [1.6, 0, 0]);
      return [
        [`fore-leg-${index}`, { d: limbPath(shoulder, 2, add(paw, [0, 1, 0]), 1.15) }],
        ...solid(
          `fore-${index}`,
          footSolid(add(paw, scale(ahead, -0.6)), add(paw, ahead), 1.4, 1.1, frame),
        ),
      ];
    }),
  ]) satisfies Record<string, Part>;

  const headDepth = depthOf(head.at);
  const torsoDepth = depthOf(body.torsoAt);
  // Back to front: what's nearer the camera is drawn over. Parts on another (the muzzle on its head,
  // its ears in it) go before it or after it by which side of it they're on, going round.
  const layers: [string, number][] = [
    ["torso", torsoDepth],
    ["head", headDepth],
    ["muzzle", headDepth + roundOf(sub(muzzle.center, head.at)) * 3 + 0.4],
    // Each part on its body over or under it by the side it's on (kept steady in `sidesOf`).
    ["tail", torsoDepth + (bunny.sides.tail ? OVER.tail : -OVER.tail)],
    ...ears.map(({ depth }, index): [string, number] => [
      `ear-${index}`,
      bunny.sides[`ear-${index}`]
        ? Math.max(headDepth + depth, torsoDepth + OVER.ear)
        : Math.min(headDepth + depth, torsoDepth - OVER.ear),
    ]),
    ...body.haunches.map((_, index): [string, number] => [
      `haunch-${index}`,
      torsoDepth + (bunny.sides[`haunch-${index}`] ? OVER.haunch : -OVER.haunch),
    ]),
    // A hind foot over its body under its near haunch; or under its body and either haunch.
    ...hinds.map((_, index): [string, number] => [
      `hind-${index}`,
      torsoDepth + (bunny.sides[`hind-${index}`] ? OVER.hind : -OVER.haunch - 0.3),
    ]),
    // A forepaw before or behind its body; up at its face, before its head.
    ...fores.map((_, index): [string, number] => {
      if (bunny.sides[`fore-${index}-head`]) {
        return [`fore-${index}`, headDepth + 0.2];
      }
      return [
        `fore-${index}`,
        torsoDepth + (bunny.sides[`fore-${index}`] ? OVER.fore : -OVER.fore),
      ];
    }),
  ];
  const top = Math.min(toScreen(head.at).y - HEAD_RADII[1], ...ears.map(({ tip }) => tip.y));
  const headSeen = toScreen(head.at);
  return {
    at: { x: bunny.walker.x, y: bunny.walker.y },
    bubble: { x: headSeen.x, y: top - 8 },
    order: layers.toSorted((a, b) => a[1] - b[1]).map(([name]) => name),
    parts,
    say: bunny.emotes.line,
  };
};
