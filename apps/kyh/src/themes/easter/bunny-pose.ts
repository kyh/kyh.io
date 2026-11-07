// How the bunny (`bunny.ts`) looks this frame, built in the round and seen
// from a little above (`../follower/solid.ts`): a white rabbit's body, round
// at the rump and rising to its chest and breathing, a haunch on each side,
// its head with its eyes high on either side, a muzzle of two whisker pads
// under a pink nose that twitches, long ears lined pink, short forelegs, long
// hind feet and a cotton tail. Its body rides its hops (`hop.ts`): crouched,
// up in an arc, pitched nose up pushing off and nose down landing; its feet
// stand where its hops set them down, and its legs reach to them: a hind leg
// kicked back behind its haunch as it pushes off and flies. A binky and a
// thump are keyed here, beat by beat. Its ears and tail are chains
// (`../follower/chain.ts`) stepped in the behavior's step from where they
// hang at rest here (`hangsOf`); its ears keep up and back as it noses down,
// rooted in its head. Each part is a layer stacked by the side of its body
// it's on, kept steady (`sidesOf`). In its own pixels: x forward, y up, z to
// its left, its feet at the origin. Pure (what a step works out is kept for
// the rest of that step: the same state, the same answer).
import type { Chain, Hang, Point } from "../follower/chain";
import type { Part, Pose } from "../follower/creature";
import type { Ellipse, Ellipsoid, Mat3, Vec3 } from "../follower/solid";
import type { Act, Bunny } from "./bunny";
import type { Footing } from "./hop";
import { round } from "../art";
import { chainAbout, hangOf } from "../follower/chain";
import { legTo } from "../follower/feet";
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
import { FORE_REACH, feetOf, HIND_LIFT, HIND_REST, placeOf, SHOULDER } from "./hop";

/**
 * How big it's drawn, to its own pixels: about the ghost's size on the screen.
 * Its hops and feet are in its own pixels (`hop.ts`); its chains in the
 * screen's, so they're handed this to go between.
 */
export const SIZE = 1.15;
const TORSO: Vec3 = [-2.4, 8.4, 0];
const TORSO_RADII: Vec3 = [9.6, 7.4, 7];
const CHEST: Vec3 = [3.8, 9.4, 0];
const CHEST_RADII: Vec3 = [5.6, 7, 5.8];
const HAUNCH: Vec3 = [-6.2, 6, 4.4];
const HAUNCH_RADII: Vec3 = [5.8, 5.6, 3.3];
/** How far its head turns from its body, either way. */
const NECK_TURN = 1;
/** Where its head turns and nods about, and its head about that. */
const NECK: Vec3 = [5.4, 13.6, 0];
const HEAD: Vec3 = [3.4, 4.4, 0];
const HEAD_RADII: Vec3 = [6.4, 5.5, 5];
/** Its whisker pads, either side under its nose, about its head. */
const PAD: Vec3 = [5, -2.3, 1.45];
const PAD_RADII: Vec3 = [2.3, 2.1, 1.9];
const NOSE: Vec3 = [6.9, -0.9, 0];
const NOSE_TIP: Vec3 = [8.2, -0.9, 0];
/** Its eyes: which way from its head's middle, and how big. */
const EYE: Vec3 = [0.42, 0.34, 0.84];
const EYE_R = 1.75;
/** Its ears: rooted well into the top of its head, each this long, in this many links. */
const EAR_ROOT: Vec3 = [-1.6, 3.2, 1.9];
const EAR_LINKS = 4;
const EAR_LENGTH = 17.5;
/** How much each link of an ear curves back on the one before, and how far the floppier one's tip folds out. */
const EAR_CURL = 0.07;
const EAR_FOLD = 0.2;
const EAR_WIDTH = 2.75;
/** How much of its head's nod its ears keep: nosing down, they stay up and back. */
const EAR_NOD = 0.2;
/** Its tail, at the top of its rump, and how far it sticks out. */
const TAIL: Vec3 = [-11.4, 9.6, 0];
const TAIL_OUT = 2.6;
const TAIL_R = 3.1;
/** Its hind feet's length, heel to toe; its hips (in its haunches), and the bones from hip to knee to heel. */
const FOOT = 7.6;
const HIP: Vec3 = [-6.6, 4.6, 4.2];
const THIGH = 5.2;
const SHIN = 7.6;
/** Its shoulders, in its own pixels (`hop.ts` plans its forepaws within reach of them). */
const SHOULDER_AT: Vec3 = [SHOULDER.x, SHOULDER.y, SHOULDER.side];
/** Grooming, which way from its head's middle its paws scrub (up and down by the middle one), and how far off it. */
const PAW_WASH: Vec3 = [0.8, 0.55, 0.45];
const PAW_OFF_HEAD = 1.6;
/** Its hind feet kicked out behind in a binky: soles up, toes trailing. */
const KICKED = 2.85;
/** What it pitches about: over its hind feet; what its rear lifts about, stamping: its forepaws. And the middle it squashes and stretches about. */
const PIVOT: Vec3 = [-3.5, 2.5, 0];
const FRONT: Vec3 = [7, 1.5, 0];
const MIDDLE: Vec3 = [-1, 8, 0];
/** How far it rears up, sat up tall; and how far its rear lifts to stamp. */
const REAR = 0.78;
const STAMP_LIFT = 0.32;
/** Where the light comes from, as `solid.ts` has it: an ear's lit side is moved toward it. */
const LIGHT = { x: -0.55, y: -0.83 };

/** No shift: a part drawn where it is. */
const UNMOVED: Point = { x: 0, y: 0 };

/** How long each act lasts, seconds. */
export const ACT_S = {
  binky: 0.8,
  groom: 2.6,
  none: 0,
  sniff: 1.8,
  stand: 2.8,
  thump: 0.6,
} as const satisfies Record<Act, number>;

/** A binky's beats, seconds in: it springs up out of its crouch, and lands. And how high it goes. */
export const BINKY_BEATS = { landing: 0.52, takeOff: 0.12 } as const;
const BINKY_HEIGHT = 18;
/** A thump's beat: its hind feet come down. */
export const THUMP_BEATS = { stamp: 0.24 } as const;

const GROUNDED = { air: 0, kick: 0, lift: 0, pitch: 0, roll: 0, twist: 0 } as const;

/**
 * A binky `t` seconds in: a quick crouch, then up in an arc as anything thrown
 * is, twisting and rolling, its hind feet kicked out at the top; then down,
 * taking the landing.
 */
export const binkyAt = (t: number) => {
  const { landing, takeOff } = BINKY_BEATS;
  if (t < takeOff) {
    return { ...GROUNDED, lift: -3 * Math.sin((Math.PI * t) / takeOff) };
  }
  if (t < landing) {
    const w = (t - takeOff) / (landing - takeOff);
    const arc = Math.sin(Math.PI * w);
    return {
      air: arc,
      kick: arc ** 1.5,
      lift: 4 * BINKY_HEIGHT * w * (1 - w),
      pitch: 0.22 * arc,
      roll: 0.35 * arc,
      twist: 0.75 * Math.sin(2 * Math.PI * w),
    };
  }
  const v = Math.min(1, (t - landing) / (ACT_S.binky - landing));
  return { ...GROUNDED, lift: -2.5 * Math.sin(Math.PI * v) };
};

/** A thump `t` seconds in: up on the alert, its rear lifting, then its hind feet brought down hard. */
export const thumpAt = (t: number) => {
  const rise = THUMP_BEATS.stamp - 0.04;
  const stamp = t < rise ? smooth(t / rise) : Math.max(0, 1 - (t - rise) / 0.04);
  return { alert: smooth(Math.min(t / 0.1, (ACT_S.thump - t) / 0.2)), stamp };
};

/** How much a surface's way faces the camera, -1 turned straight away to 1 straight at it: not clamped, so a turned-away part never shows. */
const toward = (way: Vec3) => dot(normalize(way), TOWARD_CAMERA);

/** A rise and fall over `from` to `to` of a hop, 0 outside it. */
const bumpOf = (u: number, from: number, to: number) =>
  u > from && u < to ? Math.sin((Math.PI * (u - from)) / (to - from)) : 0;

/** Where it is in its hop this frame: where on the ground, its heading, its body's rise and pitch. */
const hopOf = (bunny: Bunny) => {
  const place = placeOf(bunny.hopper);
  // Nose up as it pushes off, down as it lands on its forepaws.
  const pitch = 0.22 * place.size * (bumpOf(place.u, 0.06, 0.36) - bumpOf(place.u, 0.5, 0.84));
  return { ...place, pitch };
};

/** Its binky and thump this frame. */
const actsOf = (bunny: Bunny) => ({
  binky: bunny.act === "binky" ? binkyAt(bunny.actFor) : GROUNDED,
  thump: bunny.act === "thump" ? thumpAt(bunny.actFor) : { alert: 0, stamp: 0 },
});

/** Its frame this frame: how a point or a direction of its body is placed in the world. */
const frameOf = (bunny: Bunny) => {
  const { rig } = bunny;
  const hop = hopOf(bunny);
  const acts = actsOf(bunny);
  const { binky, thump } = acts;
  const stand = rig.stand.x;
  const low = 1.8 * rig.doze.x + 0.9 * rig.content.x;
  const pitch = hop.pitch + REAR * stand - 0.38 * rig.sniff.x + binky.pitch;
  const body: Mat3 = compose(pitchOf(pitch), rollOf(binky.roll));
  // Stamping, its rear lifts about its forepaws.
  const rear: Mat3 = pitchOf(-STAMP_LIFT * thump.stamp);
  const yaw = yawOf(hop.heading + binky.twist);
  const lift = hop.lift + binky.lift + 1.2 * stand - low;
  // Squashed and stretched along its length, keeping its bulk; flatter dozing, a loaf.
  const long = 1 + bunny.squash.x - 0.06 * rig.doze.x;
  const thin = 1 / Math.sqrt(long);
  // Breathing: its body swelling and easing, deeper and slower asleep.
  const breath = 1 + (0.015 + 0.01 * rig.doze.x) * Math.sin(bunny.breath);
  const stretched = (local: Vec3): Vec3 => [
    MIDDLE[0] + (local[0] - MIDDLE[0]) * long,
    MIDDLE[1] + (local[1] - MIDDLE[1]) * thin,
    local[2] * Math.sqrt(thin),
  ];
  const turn = (direction: Vec3): Vec3 => apply(yaw, apply(rear, apply(body, direction)));
  const place = (local: Vec3): Vec3 => {
    const pitched = add(apply(body, sub(stretched(local), PIVOT)), PIVOT);
    return add(apply(yaw, add(apply(rear, sub(pitched, FRONT)), FRONT)), [0, lift, 0]);
  };
  return {
    acts,
    breath,
    heading: hop.heading + acts.binky.twist,
    hop,
    lift,
    long,
    pitch,
    place,
    thin,
    turn,
    yaw,
  };
};

type Frame = ReturnType<typeof frameOf>;

/** Its head: where it is, and its own turn and nod, holding it near level as its body pitches. */
const headOf = (bunny: Bunny, frame: Frame) => {
  const { rig } = bunny;
  const nod = rig.nod.x - frame.pitch * 0.75;
  // Turned to where it's going, ahead of its body (as far as its neck goes), and looking about besides.
  const ahead = Math.atan2(
    Math.sin(rig.gaze.x - frame.heading),
    Math.cos(rig.gaze.x - frame.heading),
  );
  const own: Mat3 = compose(
    yawOf(rig.look.x + Math.max(-NECK_TURN, Math.min(NECK_TURN, ahead))),
    pitchOf(nod),
  );
  const direction = (local: Vec3) => frame.turn(apply(own, local));
  const at = add(frame.place(NECK), direction(HEAD));
  const point = (local: Vec3) => add(at, direction(local));
  return { at, direction, nod, pitch: frame.pitch, point };
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

/**
 * Where an ear (1 its left) lies at rest, in its head's own pixels, root to
 * tip; and its inside's way and its middle link's turn. Its ears keep only a
 * little of its head's nod, so nosing down they stay up and back; one
 * swivels out now and then.
 */
const earRestOf = (bunny: Bunny, head: Head, side: 1 | -1, index: number) => {
  const { rig } = bunny;
  const swivel = rig.swivel[index]?.x ?? 0;
  // Its left ear stands a little straighter; its right is the floppier, its tip folding out.
  // Its ears keep a little of its nod, and none of its body's pitch: sat up, they stand up, not laid back.
  const lay =
    rig.lay.x +
    (side === 1 ? -0.1 : 0.24) -
    rig.nod.x * (1 - EAR_NOD) -
    (head.nod - rig.nod.x) -
    head.pitch;
  const splay = 0.24 + 0.2 * Math.max(0, rig.lay.x) + 0.25 * swivel;
  // Set a little apart fore and aft, so side on one doesn't hide the other.
  let at: Vec3 = [EAR_ROOT[0] + 0.6 * side, EAR_ROOT[1], EAR_ROOT[2] * side];
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
  // Its inside faces forward and out, swivelled further out to a sound; laid back, it turns out and down, as a rabbit's does folded flat.
  const back = Math.max(0, lay);
  const inside = apply(
    compose(yawOf(side * swivel), compose(rollOf(side * splay), pitchOf(-0.5 * back))),
    normalize([1, 0, (0.85 + back) * side]),
  );
  return { inside, middle, points };
};

/** How near the camera an ear is, about its head: before it turned to the camera, over it turned away, more so laid back toward the camera. */
const earDepthOf = (points: readonly Vec3[], head: Head) => {
  const root = head.point(points[0] ?? EAR_ROOT);
  const middle = head.point(points[2] ?? EAR_ROOT);
  return roundOf(sub(root, head.at)) * 2.5 + Math.max(0, roundOf(sub(middle, root))) * 0.8;
};

/** Its tail's root and where its tip hangs at rest, flagged up alarmed. */
const tailRestOf = (bunny: Bunny): Vec3[] => [
  TAIL,
  add(TAIL, scale(normalize([-1, 0.5 + bunny.rig.tail.x, 0]), TAIL_OUT)),
];

// Its feet.

/** How far a foot must move to be within `reach` of `from`: nothing if it is already. */
const reachOf = (from: Vec3, foot: Vec3, reach: number): Vec3 => {
  const off = sub(foot, from);
  const far = Math.hypot(off[0], off[1], off[2]);
  return far > reach ? scale(off, (reach - far) / far) : [0, 0, 0];
};

/** A foot on the ground in its own pixels about where its body is. */
const worldOf = (footing: Footing, at: { x: number; z: number }): Vec3 => [
  footing.x - at.x,
  footing.height,
  footing.z - at.z,
];

/** A hind foot (1 its left): its toe where it's set down or swinging, its heel lifting as it pushes off and trailing behind in the air. */
const hindOf = (bunny: Bunny, frame: Frame, footing: Footing, side: 1 | -1) => {
  const { binky, thump } = frame.acts;
  const { leap, u } = bunny.hopper;
  // A little hop round hardly lifts its heels.
  const size = leap ? Math.min(1, leap.size * 2.5 + 0.15) : 0;
  let angle = 0;
  if (footing.swing >= 0) {
    const w = footing.swing;
    angle = w < 0.35 ? 0.9 + 1.2 * smooth(w / 0.35) : 2.1 * (1 - smooth((w - 0.35) / 0.5));
  } else if (leap && u < HIND_LIFT) {
    angle = 0.9 * smooth((u - (HIND_LIFT - 0.16)) / 0.16);
  }
  angle *= size;
  const { kick } = binky;
  // A thump lifts its heels with its rear and brings them down hard; a binky kicks its feet out behind.
  angle = (angle + 0.5 * thump.stamp) * (1 - kick) + KICKED * kick;
  const forward: Vec3 = [Math.cos(footing.turn), 0, Math.sin(footing.turn)];
  const left: Vec3 = [-Math.sin(footing.turn), 0, Math.cos(footing.turn)];
  const toe = add(
    add(
      worldOf(footing, frame.hop.at),
      add(scale(forward, -11 * kick), scale(left, side * 3.4 * kick)),
    ),
    [0, Math.max(0, binky.lift) * 0.92 + 3 * thump.stamp + 4 * kick, 0],
  );
  const placed = add(add(toe, scale(forward, -FOOT * Math.cos(angle))), [
    0,
    FOOT * Math.sin(angle),
    0,
  ]);
  // Swinging, its foot goes no farther from its hip than its leg reaches: drawn in, not stretched.
  const hip = frame.place([HIP[0], HIP[1], HIP[2] * side]);
  const pull: Vec3 = footing.swing >= 0 ? reachOf(hip, placed, THIGH + SHIN - 0.5) : [0, 0, 0];
  const heel = add(placed, pull);
  // Its leg's out from under its haunch: pushing off, flying, kicking.
  // Kicked right out behind it, in a binky (once a binky, while it's up).
  const kicked = kick > 0.3;
  return { heel, kicked, toe: add(toe, pull) };
};

type Hind = ReturnType<typeof hindOf>;

/** A forepaw (1 its left): where it's set down or swinging; up in front of its chest sat up or flying, rubbing its face grooming. */
const foreOf = (
  bunny: Bunny,
  frame: Frame,
  head: Head,
  footing: Footing,
  side: 1 | -1,
  index: number,
) => {
  const { rig } = bunny;
  const { binky } = frame.acts;
  const shoulder = frame.place([SHOULDER_AT[0], SHOULDER_AT[1], SHOULDER_AT[2] * side]);
  const set = worldOf(footing, frame.hop.at);
  // Swinging, its paw's drawn in toward its shoulder as far as its leg can't reach, most in mid-air and
  // none as it lifts and lands, so it never jumps; what's left, its leg's top leans to (`foreParts`).
  const swinging = footing.swing >= 0 ? Math.sin(Math.PI * footing.swing) : 0;
  const ground = add(set, scale(reachOf(shoulder, set, FORE_REACH), swinging));
  // Up off the ground: dangling below its shoulders sat up or flying; rubbing its face grooming.
  const forward: Vec3 = [Math.cos(frame.heading), 0, Math.sin(frame.heading)];
  const hanging = add(add(shoulder, [0, -5, 0]), scale(forward, 2.2));
  // Up and down beside its nose, just off its head: on it, not in it.
  const scrub = bunny.time * 7 + index * Math.PI;
  const wash = surfaceOf(HEAD_RADII, [
    PAW_WASH[0],
    PAW_WASH[1] * Math.sin(scrub),
    PAW_WASH[2] * side,
  ]);
  const face = head.point(add(wash.at, scale(wash.normal, PAW_OFF_HEAD)));
  const groom = rig.groom.x;
  const up = Math.max(rig.stand.x, groom, smooth(binky.lift / 6));
  const raised = add(scale(hanging, 1 - groom), scale(face, groom));
  // Which way it points: as it was set down on the ground; dangling, down and a little forward; grooming, up its face.
  const pointed: Vec3 = [Math.cos(footing.turn), 0, Math.sin(footing.turn)];
  const dangling = normalize(add(scale(forward, 0.45), [0, -1, 0]));
  const held = normalize(
    add(scale(dangling, 1 - groom), scale(head.direction([0.3, 1, 0]), groom)),
  );
  return {
    ahead: normalize(add(scale(pointed, 1 - up), scale(held, up))),
    at: add(scale(ground, 1 - up), scale(raised, up)),
    shoulder,
  };
};

type Fore = ReturnType<typeof foreOf>;

/** How far its haunches are drawn up after its hind feet: forward under it landing, back pushing off. */
const bunchOf = (hinds: readonly Hind[], heading: number) => {
  const forward = hinds.reduce(
    (sum, { toe }) => sum + toe[0] * Math.cos(heading) + toe[2] * Math.sin(heading),
    0,
  );
  return Math.max(-3, Math.min(4, 0.45 * (forward / Math.max(1, hinds.length) - HIND_REST.x)));
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
  const root = line[0] ?? tip;
  const second = line[1] ?? tip;
  const rootLength = Math.hypot(second.x - root.x, second.y - root.y) || 1;
  const rootWidth = widthAt(0);
  const rootNormal = {
    x: (-(second.y - root.y) / rootLength) * rootWidth,
    y: ((second.x - root.x) / rootLength) * rootWidth,
  };
  const rootTangent = {
    x: (-(second.x - root.x) / rootLength) * rootWidth,
    y: (-(second.y - root.y) / rootLength) * rootWidth,
  };
  // Round both ends: a half circle from one side to the other, at its tip and at its root.
  const capOf = (at: Point, normal: Point, tangent: Point, from: number) =>
    Array.from({ length: 7 }, (_, index) => {
      const angle = from + ((index + 1) / 8) * Math.PI;
      return {
        x: at.x + shift.x + normal.x * Math.cos(angle) + tangent.x * Math.sin(angle),
        y: at.y + shift.y + normal.y * Math.cos(angle) + tangent.y * Math.sin(angle),
      };
    });
  return polygon([
    ...left,
    ...capOf(tip, tipNormal, tipTangent, 0),
    ...right.toReversed(),
    ...capOf(root, rootNormal, rootTangent, Math.PI),
  ]);
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

/** In a solid's own axes, scaled to a unit sphere: a point, and the camera's way. */
const unitOf = (point: Vec3, { center, radii, turn }: Ellipsoid) => {
  const [ax, ay, az] = [turn([1, 0, 0]), turn([0, 1, 0]), turn([0, 0, 1])];
  const unit = (v: Vec3): Vec3 => [
    dot(ax, v) / radii[0],
    dot(ay, v) / radii[1],
    dot(az, v) / radii[2],
  ];
  return { e: unit(TOWARD_CAMERA), q: unit(sub(point, center)) };
};

/**
 * How far a point is from hiding behind a solid, in the solid's radii: past
 * zero it's either before the solid's middle or out past its outline. Unlike
 * `aheadOf` it has a value all the way round, so it can be kept steady.
 */
const clearOf = (point: Vec3, ellipsoid: Ellipsoid) => {
  const { e, q } = unitOf(point, ellipsoid);
  const before = dot(q, normalize(e));
  return Math.max(before, Math.sqrt(Math.max(0, dot(q, q) - before ** 2)) - 1);
};

/**
 * How far a point is in front of a solid's near side, along the camera's line
 * through it (negative behind it); null if the line misses the solid, so
 * they don't overlap on the screen.
 */
const aheadOf = (point: Vec3, ellipsoid: Ellipsoid) => {
  const { e, q } = unitOf(point, ellipsoid);
  const a = dot(e, e);
  const b = 2 * dot(q, e);
  const c = dot(q, q) - 1;
  const crossing = b * b - 4 * a * c;
  return crossing < 0 ? null : (b - Math.sqrt(crossing)) / (2 * a);
};

/** How far round an ellipse reaches from its middle, any way, and a little over. */
const reachOfEllipse = (outline: Ellipse) => Math.max(outline.rx, outline.ry) + 1.5;

/** A box just round some ellipses (its haunches), a little over. */
const aroundOf = (outlines: readonly Ellipse[]) => {
  const left = Math.min(...outlines.map((outline) => outline.cx - reachOfEllipse(outline)));
  const right = Math.max(...outlines.map((outline) => outline.cx + reachOfEllipse(outline)));
  const top = Math.min(...outlines.map((outline) => outline.cy - reachOfEllipse(outline)));
  const bottom = Math.max(...outlines.map((outline) => outline.cy + reachOfEllipse(outline)));
  return `M${round(left)} ${round(top)}H${round(right)}V${round(bottom)}H${round(left)}Z`;
};

/** Its body: its torso and chest, squashed and stretched and breathing, its haunches either side drawn after its hind feet. */
const bodyOf = (frame: Frame, bunch: number) => {
  const stretch = (radii: Vec3, breath = 1): Vec3 => [
    radii[0] * frame.long * breath,
    radii[1] * frame.thin * breath,
    radii[2] * Math.sqrt(frame.thin) * breath,
  ];
  const torso = frame.place(TORSO);
  const chest = frame.place(CHEST);
  const haunches = ([1, -1] as const).map((side) => {
    const center = frame.place([HAUNCH[0] + bunch, HAUNCH[1], HAUNCH[2] * side]);
    return { center, outline: ellipseOf(center, axesOf(stretch(HAUNCH_RADII), frame.turn)) };
  });
  return {
    chest: ellipseOf(chest, axesOf(stretch(CHEST_RADII, frame.breath), frame.turn)),
    haunches,
    torso: ellipseOf(torso, axesOf(stretch(TORSO_RADII, frame.breath), frame.turn)),
    torsoAt: torso,
  };
};

/** What's worked out a step, kept for the rest of it. */
interface Geometry {
  body: ReturnType<typeof bodyOf>;
  bunch: number;
  ears: ReturnType<typeof earRestOf>[];
  fores: Fore[];
  frame: Frame;
  head: Head;
  hinds: Hind[];
}

const KEPT = new WeakMap<Bunny, { geometry: Geometry; version: number }>();

/** Everything placed this frame, worked out once a step. */
const geometryOf = (bunny: Bunny) => {
  const kept = KEPT.get(bunny);
  if (kept && kept.version === bunny.version) {
    return kept.geometry;
  }
  const frame = frameOf(bunny);
  const head = headOf(bunny, frame);
  const feet = feetOf(bunny.hopper);
  const hinds = ([1, -1] as const).map((side, index) =>
    hindOf(bunny, frame, feet.hind[index === 0 ? 0 : 1], side),
  );
  const fores = ([1, -1] as const).map((side, index) =>
    foreOf(bunny, frame, head, feet.fore[index === 0 ? 0 : 1], side, index),
  );
  const bunch = bunchOf(hinds, frame.hop.heading);
  const ears = ([1, -1] as const).map((side, index) => earRestOf(bunny, head, side, index));
  const geometry = { body: bodyOf(frame, bunch), bunch, ears, fores, frame, head, hinds };
  KEPT.set(bunny, { geometry, version: bunny.version });
  return geometry;
};

/** The screen height its chains hang about (see `hangsOf`). */
const CHAIN_HEIGHT = 0;

/** Where its ears and tail hang at rest this frame, on the screen: the chains' roots and shapes. */
export const hangsOf = (bunny: Bunny) => {
  const { ears, frame, head } = geometryOf(bunny);
  // Its chains feel the air of its going across, not toward or away from the camera: going up the screen
  // isn't wind on its ears from above. So they hang from where it is across, at a fixed height.
  const origin = { x: bunny.walker.x, y: CHAIN_HEIGHT };
  const earHang = (index: number) =>
    hangOf(
      (ears[index]?.points ?? []).map((local) => toScreen(head.point(local))),
      origin,
      SIZE,
    );
  const hangs: [Hang, Hang] = [earHang(0), earHang(1)];
  const tail = hangOf(
    tailRestOf(bunny).map((local) => toScreen(frame.place(local))),
    origin,
    SIZE,
  );
  return { ears: hangs, tail };
};

/** An ear (1 its left) drawn along its chain: its back, its lit side, and its pink inside as far as it faces the camera. */
const earOf = (bunny: Bunny, head: Head, rest: ReturnType<typeof earRestOf>, chain: Chain) => {
  const root = head.point(rest.points[0] ?? EAR_ROOT);
  const rootSeen = toScreen(root);
  // The chain about the ear's root as it is now: a frame too short to step the chain leaves it where it was.
  const knots = chainAbout(chain, { x: 0, y: 0 }, SIZE);
  const first = knots[0] ?? { x: 0, y: 0 };
  const points = knots.map((knot) => ({
    x: knot.x - first.x + rootSeen.x,
    y: knot.y - first.y + rootSeen.y,
  }));
  // Pointing at the camera, it's seen foreshortened: its line drawn straight from root to tip, a short round blade, not a crumple.
  const tipSeen = points.at(-1) ?? rootSeen;
  let arc = 0;
  for (const [index, point] of points.entries()) {
    const before = points[index - 1] ?? point;
    arc += Math.hypot(point.x - before.x, point.y - before.y);
  }
  const straight = smooth((0.8 - arc / EAR_LENGTH) / 0.35);
  const last = Math.max(1, points.length - 1);
  const line = smoothLine(
    points.map((point, index) => ({
      x: point.x + (rootSeen.x + ((tipSeen.x - rootSeen.x) * index) / last - point.x) * straight,
      y: point.y + (rootSeen.y + ((tipSeen.y - rootSeen.y) * index) / last - point.y) * straight,
    })),
  );
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
  // Its inside shows as it turns to the camera, fading in over a wide turn; laid flat, it's hidden under it.
  const shown =
    smooth((toward(inside) + 0.15) / 0.75) * (1 - smooth((bunny.rig.lay.x - 0.45) / 0.5));
  const lit = EAR_WIDTH * broad * 0.55;
  return {
    depth: earDepthOf(rest.points, head),
    lining: { d: leafOf(line.slice(1), lining), opacity: round(shown) },
    tip,
    whole: leafOf(line, width),
    wholeLit: leafOf(line, width, { x: LIGHT.x * lit, y: LIGHT.y * lit }),
  };
};

// Its head's face.

/** Its eyes: dark, high on either side of its head, a glint in each; shut in a curve, dozing or content. */
const eyesOf = (bunny: Bunny, head: Head) => {
  // Its eyes open or shut, swapped at once as it closes them: never a grey half-faded disc.
  const open = Math.max(bunny.rig.doze.x, bunny.rig.content.x) < 0.5 ? 1 : 0;
  return ([1, -1] as const).flatMap((side, index) => {
    const { at, normal } = surfaceOf(HEAD_RADII, [EYE[0], EYE[1], EYE[2] * side]);
    const world = head.direction(normal);
    const center = head.point(add(at, scale(normal, 0.15)));
    const [u, v] = tangentsOf(world);
    // Fading in as it comes round the head, over a wide turn: never a pop.
    const shown = smooth((toward(world) + 0.1) / 0.65);
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
          opacity: round(shown * open),
        },
      ],
      [
        `glint-${index}`,
        {
          d: ellipsePath(ellipseOf(glint, [scale(u, 0.5), scale(v, 0.5)])),
          opacity: round(shown * open),
        },
      ],
      [`lid-${index}`, { d: linePath(lid), opacity: round(shown * (1 - open)) }],
    ] as const;
  });
};

/** Its muzzle: two whisker pads, a pink nose twitching over them (the pads and whiskers with it), its mouth, and whiskers out either side. */
const muzzleOf = (bunny: Bunny, head: Head) => {
  // Its nose twitches a couple of times a second, quicker and harder sniffing.
  const twitch = Math.max(0, Math.sin(bunny.twitch * 14)) ** 0.7 * (0.6 + 0.4 * bunny.rig.sniff.x);
  const pads = ([1, -1] as const).map((side) => {
    const center = head.point([PAD[0], PAD[1] + 0.35 * twitch, PAD[2] * side]);
    return { center, outline: ellipseOf(center, axesOf(PAD_RADII, head.direction)) };
  });
  const nose = (x: number, y: number, z: number) =>
    head.point([
      NOSE[0] + x,
      NOSE[1] + 0.7 * twitch + y * (1 + 0.3 * twitch),
      z * (1 + 0.3 * twitch),
    ]);
  const bottom = nose(0.1, -0.7, 0);
  const whiskers = ([1, -1] as const).flatMap((side) =>
    [
      [0.8, 0.9],
      [1.4, -0.3],
      [0.6, -1.6],
    ].map(([out = 0, rise = 0]) => {
      const from = head.point([PAD[0] + 0.4, PAD[1] + 0.2 + 0.35 * twitch, (PAD[2] + 1.2) * side]);
      return [
        from,
        head.point([PAD[0] + 2.6 + out, PAD[1] + rise + 0.4 + 0.6 * twitch, (PAD[2] + 5.2) * side]),
      ];
    }),
  );
  return {
    center: head.point([PAD[0], PAD[1], 0]),
    mouth: linesPath([
      [bottom, head.point([6.5, -2.9, 0])],
      [head.point([6.5, -2.9, 0]), head.point([6, -3.4, 1])],
      [head.point([6.5, -2.9, 0]), head.point([6, -3.4, -1])],
    ]),
    // Its nose a little rounded forward, so side on it has a tip, not an edge.
    nose: hullPath([
      nose(-0.1, 0.6, 1.15),
      nose(-0.1, 0.6, -1.15),
      nose(0.3, 0.8, 0),
      nose(1.3, 0.2, 0.6),
      nose(1.3, 0.2, -0.6),
      nose(1.1, -0.5, 0),
      bottom,
    ]),
    pads,
    whiskers: linesPath(whiskers),
  };
};

// What's in front of what.

/** Whether a measure that's positive on one side has it there: kept as it was until it's past `band` the other way. */
const steady = (was: boolean | undefined, margin: number, band: number) => {
  if (was === undefined) {
    return margin > 0;
  }
  return was ? margin > -band : margin > band;
};

/** How far a point must be past a solid's side to change which side it's drawn: so a part doesn't flicker over and under as it passes. */
const SETTLED = 0.8;
/** Which side of its body its haunches, forelegs and tail show, by which way they face: a band so a hop's pitch can't flip them. */
const FACING_BAND = 0.15;
/** How far its nose must be past its head's outline, in its head's radii, to change which side its muzzle's drawn: a hop's pitch and a sniff's nod stay inside it. */
const MUZZLE_BAND = 0.1;
/** How far grooming goes before its paws are up about its head, and not on the ground. */
const PAWS_UP = 0.3;
/** Its haunches', forelegs' and tail's ways out from its body. */
const HAUNCH_OUT: Vec3 = [-0.6, 0, 0.8];
const FORE_OUT: Vec3 = [0.6, 0, 0.8];
const TAIL_OUT_WAY: Vec3 = [-1, 0.4, 0];
/** How far a layer drawn over or under its body sits from it, in the stacking. */
const OVER = {
  ear: 0.3,
  earOver: 1.6,
  fore: 0.6,
  haunch: 1,
  head: 2.5,
  hind: 0.5,
  kicked: 1.4,
  muzzle: 0.4,
  tail: 1.2,
} as const;

/** Whether a point's in front of some solids: of every one it overlaps; kept as it was until it's clearly crossed. */
const sideOf = (
  point: Vec3,
  solids: readonly Ellipsoid[],
  was: boolean | undefined,
  otherwise: boolean,
) => {
  const margins = solids.map((one) => aheadOf(point, one)).filter((margin) => margin !== null);
  if (margins.length === 0) {
    return was ?? otherwise;
  }
  return steady(was, Math.min(...margins), SETTLED);
};

/** Which of its parts are on the near side of its body (and its paws before its head) this frame, for the behavior to keep. */
export const sidesOf = (bunny: Bunny): Record<string, boolean> => {
  const { body, ears, frame, head } = geometryOf(bunny);
  const was = bunny.sides;
  const torsoDepth = depthOf(body.torsoAt);
  const torso: Ellipsoid = { center: body.torsoAt, radii: TORSO_RADII, turn: frame.turn };
  const headSolid: Ellipsoid = { center: head.at, radii: HEAD_RADII, turn: head.direction };
  const entries: [string, boolean][] = [];
  for (const [index, side] of ([1, -1] as const).entries()) {
    const points = ears[index]?.points ?? [];
    const ear = head.point(points[2] ?? EAR_ROOT);
    const out = (way: Vec3) => toward(frame.turn([way[0], way[1], way[2] * side]));
    // Which side of its head its paw scrubs: where it is in a scrub mustn't move it over and under.
    const cheek = toward(head.direction([PAW_WASH[0], 0, PAW_WASH[2] * side]));
    // Its ear over its body where they overlap by which is in front; else by its depth, steadily.
    const earAbove = steady(
      was[`ear-${index}`],
      depthOf(head.at) + earDepthOf(points, head) - torsoDepth,
      SETTLED,
    );
    entries.push(
      [`fore-${index}`, steady(was[`fore-${index}`], out(FORE_OUT), FACING_BAND)],
      [`fore-${index}-head`, steady(was[`fore-${index}-head`], cheek, FACING_BAND)],
      [`ear-${index}`, sideOf(ear, [torso], was[`ear-${index}`], earAbove)],
      [`haunch-${index}`, steady(was[`haunch-${index}`], out(HAUNCH_OUT), FACING_BAND)],
    );
  }
  entries.push(
    // Its muzzle before its head till the tip of its nose has gone in behind its outline.
    ["pads", steady(was.pads, clearOf(head.point(NOSE_TIP), headSolid), MUZZLE_BAND)],
    ["tail", steady(was.tail, toward(frame.turn(TAIL_OUT_WAY)), FACING_BAND)],
    // Its head over its body but turned away, steadily: a hop's pitch can't flip it.
    ["head", steady(was.head, depthOf(head.at) - torsoDepth, SETTLED * 2)],
  );
  return Object.fromEntries(entries);
};

/** Its layers back to front: what's nearer the camera is drawn over. */
const orderOf = (bunny: Bunny, geometry: Geometry, ears: readonly { depth: number }[]) => {
  const { body, hinds } = geometry;
  const { sides } = bunny;
  const torsoDepth = depthOf(body.torsoAt);
  const headDepth = torsoDepth + (sides.head ? OVER.head : -OVER.head);
  const layers: [string, number][] = [
    ["torso", torsoDepth],
    ["head", headDepth],
    // Parts on another (the muzzle on its head, its ears in it) before it or after it by which side of it they're on, going round.
    // Its muzzle before its head or behind it by the one steady test its pads' ink keeps to.
    ["muzzle", headDepth + (sides.pads === false ? -OVER.muzzle : OVER.muzzle)],
    // Each part on its body over or under it by the side it's on (kept steady in `sidesOf`).
    ["tail", torsoDepth + (sides.tail ? OVER.tail : -OVER.tail)],
    ...ears.map(({ depth }, index): [string, number] => [
      `ear-${index}`,
      sides[`ear-${index}`]
        ? torsoDepth + OVER.earOver
        : Math.min(headDepth + depth, torsoDepth - OVER.ear),
    ]),
    ...body.haunches.map((_, index): [string, number] => [
      `haunch-${index}`,
      torsoDepth + (sides[`haunch-${index}`] ? OVER.haunch : -OVER.haunch),
    ]),
    // A hind leg on its haunch's side, always under its haunch: it shows where it reaches out past it,
    // pushing off and trailing. Kicked right out behind in a binky, over all.
    ...hinds.map(({ kicked }, index): [string, number] => {
      if (!sides[`haunch-${index}`]) {
        return [`hind-${index}`, torsoDepth - OVER.haunch - 0.3];
      }
      return [`hind-${index}`, torsoDepth + (kicked ? OVER.kicked : OVER.hind)];
    }),
    // A forepaw before or behind its body; up at its face, over all of its head, or under all of it.
    ...geometry.fores.map((_, index): [string, number] => {
      const beside = torsoDepth + (sides[`fore-${index}`] ? OVER.fore : -OVER.fore);
      if (bunny.rig.groom.x < PAWS_UP) {
        return [`fore-${index}`, beside];
      }
      return [
        `fore-${index}`,
        sides[`fore-${index}-head`]
          ? Math.max(headDepth, torsoDepth) + 2 * OVER.muzzle
          : Math.min(beside, headDepth - 2 * OVER.muzzle),
      ];
    }),
  ];
  return layers.toSorted((a, b) => a[1] - b[1]).map(([name]) => name);
};

/** A hind leg: its shin, from its knee (forward, under its haunch) back to its heel; and its foot. */
const hindParts = (geometry: Geometry, hind: Hind, index: number): [string, Part][] => {
  const { bunch, frame } = geometry;
  const side = index === 0 ? 1 : -1;
  const hip = frame.place([HIP[0] + bunch, HIP[1], HIP[2] * side]);
  const heel = add(hind.heel, [0, 0.9, 0]);
  const { joint } = legTo(hip, heel, THIGH, SHIN, frame.turn([1, -0.4, 0]));
  return [
    [`hind-leg-${index}`, { d: limbPath(joint, 1.9, heel, 1.25) }],
    ...solid(`hind-${index}`, footSolid(hind.heel, hind.toe, 1.7, 1.3, frame)),
  ];
};

/** A foreleg and its paw as one: the outline round its shoulder, its wrist and its paw. */
const foreParts = (
  geometry: Geometry,
  { ahead: way, at: paw, shoulder }: Fore,
  index: number,
): [string, Part][] => {
  const { frame } = geometry;
  // Its leg never longer than it is: past its reach, the top of it leans from its shoulder toward its paw, inside its chest.
  const off = sub(shoulder, paw);
  const far = Math.hypot(off[0], off[1], off[2]);
  const top = far > FORE_REACH ? add(paw, scale(off, FORE_REACH / far)) : shoulder;
  const ahead = scale(way, 1.6);
  const toe = add(paw, ahead);
  const heel = add(paw, scale(ahead, -0.6));
  return [
    [
      `fore-leg-${index}`,
      {
        d: hullPath([
          ...ringOf(top, 1.9),
          ...ringOf(add(paw, scale(normalize(sub(top, paw)), 1.2)), 1.15),
          ...ringOf(toe, 1.1),
          ...ringOf(heel, 1.1),
        ]),
      },
    ],
    ...solid(`fore-${index}`, footSolid(heel, toe, 1.4, 1.1, frame)),
  ];
};

export const bunnyPose = (bunny: Bunny): Pose => {
  const geometry = geometryOf(bunny);
  const { body, frame, head } = geometry;
  const muzzle = muzzleOf(bunny, head);
  const ears = geometry.ears.map((rest, index) =>
    earOf(bunny, head, rest, bunny.ears[index] ?? bunny.ears[0]),
  );
  // The tail at its chain's tip, about where its root is now.
  const tailKnots = chainAbout(bunny.tail, { x: 0, y: 0 }, SIZE);
  const tailSeen = toScreen(frame.place(TAIL));
  const tailTip = tailKnots.at(-1) ?? tailSeen;
  const tailFirst = tailKnots[0] ?? tailSeen;
  const tailAt = {
    x: tailTip.x - tailFirst.x + tailSeen.x,
    y: tailTip.y - tailFirst.y + tailSeen.y,
  };
  const tailLit = TAIL_R * 0.3;

  const parts = Object.fromEntries([
    ...solid("torso", body.torso),
    // Round its haunches, with its body cut out: their rims are inked only past its body.
    [
      "beyond-torso",
      { d: `${aroundOf(body.haunches.map(({ outline }) => outline))}${ellipsePath(body.torso)}` },
    ],
    ...solid("chest", body.chest),
    ...body.haunches.flatMap(({ outline }, index) => solid(`haunch-${index}`, outline)),
    ...solid("head", ellipseOf(head.at, axesOf(HEAD_RADII, head.direction))),
    ...eyesOf(bunny, head),
    // Its pads drawn whole in their own layer, before or behind its head; their ink only while they're on its near side.
    ...muzzle.pads.flatMap(({ outline }, index): [string, Part][] => [
      ...solid(`pad-${index}`, outline),
      [
        `pad-ink-${index}`,
        { d: ellipsePath(outline), opacity: bunny.sides.pads === false ? 0 : 1 },
      ],
    ]),
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
    ...geometry.hinds.flatMap((hind, index) => hindParts(geometry, hind, index)),
    ...geometry.fores.flatMap((paw, index) => foreParts(geometry, paw, index)),
  ]) satisfies Record<string, Part>;

  const top = Math.min(toScreen(head.at).y - HEAD_RADII[1], ...ears.map(({ tip }) => tip.y));
  const headSeen = toScreen(head.at);
  return {
    at: { x: bunny.walker.x, y: bunny.walker.y },
    bubble: { x: headSeen.x, y: top - 8 },
    order: orderOf(bunny, geometry, ears),
    parts,
    say: bunny.emotes.line,
  };
};
