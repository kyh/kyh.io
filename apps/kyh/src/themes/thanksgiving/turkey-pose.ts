// How the turkey (`turkey.ts`) looks this frame, built in the round and seen
// from a little above (`../follower/solid.ts`): a bronze body solid, its
// breast tipped up and puffed out strutting, a barred wing on each side
// drooping as it struts, a tail of separate feathers lying back along it
// folded and rising into an upright fan, banded dark and tipped buff, a
// neck up to its bare blue head, its eyes on either side, its beak, its red
// snood and wattle swinging, a beard on its breast, and its legs stepping on
// hocks that bend back. It turns to its heading; each part is a layer
// stacked by how near the camera it is. In its own pixels: x forward, y up,
// z to its left, its feet at the origin. Pure.
import type { Part, Pose } from "../follower/creature";
import type { Ellipse, Vec3 } from "../follower/solid";
import type { Turkey } from "./turkey";
import { round } from "../art";
import {
  add,
  apply,
  axesOf,
  compose,
  cross,
  curveOf,
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
  yawOf,
} from "../follower/solid";
import { footAt, limbOf, pace } from "../follower/walk";

/**
 * How big it's drawn, to its own pixels: about the ghost's height. Its walk is
 * in screen pixels, so a step's length is turned back into its own (`legOf`).
 */
export const SIZE = 0.7;
const BODY: Vec3 = [-1, 37, 0];
const BODY_RADII: Vec3 = [22, 16.5, 15];
/** Its breast tipped up a little. */
const BREAST_UP = 0.18;
const WING: Vec3 = [-1, 38, 12.8];
const WING_RADII: Vec3 = [16, 8, 2.4];
/** The tail's root, at the back of its body. */
const TAIL: Vec3 = [-18, 43, 0];
export const FEATHERS = 11;
const NECK: Vec3 = [13, 46, 0];
const HEAD_R = 5.5;
const HIPS = [
  [2, 24, 4.5],
  [-2, 24, -4.5],
] as const;
const THIGH = 12.5;
const SHANK = 13.5;

/** Its frame this frame: how a point or a direction of its body is placed in the world. */
const frameOf = (turkey: Turkey) => {
  const { gait, rig, walker } = turkey;
  const walking = pace(walker, gait);
  const phase = walker.phase * Math.PI * 2;
  const fan = rig.fan.x;
  // The body rides up as a leg straightens under it, sways a little, and settles as it dozes.
  const rise = Math.abs(Math.sin(phase)) * 1.6 * walking - rig.doze.x * 7;
  const sway = Math.sin(phase) * 0.05 * walking;
  // Strutting, it leans back, breast out; pecking, it bows.
  const lean = BREAST_UP + 0.12 * fan - rig.bow.x;
  const body = compose(pitchOf(lean), rollOf(sway));
  const yaw = yawOf(rig.heading.x);
  const pivot: Vec3 = [0, 26, 0];
  const turn = (direction: Vec3): Vec3 => apply(yaw, apply(body, direction));
  const place = (local: Vec3): Vec3 =>
    add(apply(yaw, add(apply(body, sub(local, pivot)), pivot)), [0, rise, 0]);
  return { fan, phase, place, rise, turn, walking, yaw };
};

type Frame = ReturnType<typeof frameOf>;

const solid = (name: string, outline: Ellipse): [string, Part][] => {
  const { lit, whole } = solidPaths(outline);
  return [
    [name, { d: whole }],
    [`${name}-lit`, { d: lit }],
  ];
};

/** Its body, puffed up strutting. */
const bodyOf = ({ fan, place, turn }: Frame) => {
  const puff = 1 + 0.09 * fan;
  const radii: Vec3 = [BODY_RADII[0] * puff, BODY_RADII[1] * puff, BODY_RADII[2] * puff];
  const center = place(BODY);
  return { center, outline: ellipseOf(center, axesOf({ center, radii, turn })) };
};

/** A wing (1 its left): a flat solid on its side, barred pale; drooping, its tip to the ground, as it struts. */
const wingOf = ({ fan, place, turn }: Frame, side: 1 | -1) => {
  const droop = compose(pitchOf(0.08 - 0.34 * fan), rollOf(0.12 * side * fan));
  const center = place([WING[0], WING[1] - 4 * fan, WING[2] * side * (1 + 0.08 * fan)]);
  const axes = [
    apply(droop, [WING_RADII[0], 0, 0]),
    apply(droop, [0, WING_RADII[1], 0]),
    apply(droop, [0, 0, WING_RADII[2]]),
  ];
  // Its barring: a pale band across its flight feathers, back and low on the wing.
  const bars = ellipseOf(
    add(center, turn(apply(droop, [-3, -3.2, side * 1.2]))),
    [scale(axes[0] ?? [0, 0, 0], 0.6), scale(axes[1] ?? [0, 0, 0], 0.35)].map(turn),
  );
  return {
    bars: ellipsePath(bars),
    depth: depthOf(center),
    outline: ellipseOf(center, axes.map(turn)),
  };
};

/** Its tail feathers: lying back along it folded, rising to stand in an upright fan. */
const feathersOf = ({ fan, place, turn }: Frame) => {
  const opened = smooth(fan);
  // The plane they lie in: flat (facing up) folded, upright (facing forward) fanned.
  const plane = normalize(mix([0, 1, 0], [1, 0, 0], opened));
  const root = place(TAIL);
  return Array.from({ length: FEATHERS }, (_, index) => {
    const t = index / (FEATHERS - 1);
    const spread = (t - 0.5) * Math.PI * 0.95;
    const folded = normalize([-1, 0.1, (t - 0.5) * 0.3]);
    const fanned = normalize([-0.3, Math.cos(spread), Math.sin(spread)]);
    const direction = normalize(mix(folded, fanned, opened));
    const length = 25 + 13 * opened * (0.7 + 0.3 * Math.sin(t * Math.PI));
    const across = normalize(cross(direction, plane));
    // Fanned, wide enough to overlap their neighbors to the tips: a solid fan.
    const width = scale(turn(across), 4 + 2.4 * opened);
    const along = (from: number, to: number) => {
      const middle = add(root, turn(scale(direction, length * ((from + to) / 2))));
      return { axis: turn(scale(direction, (length * (to - from)) / 2)), middle };
    };
    const whole = along(0, 1);
    const band = along(0.56, 1);
    const tip = along(0.76, 1);
    return {
      band: ellipsePath(ellipseOf(band.middle, [band.axis, scale(width, 0.86)])),
      depth: depthOf(whole.middle),
      tip: ellipsePath(ellipseOf(tip.middle, [tip.axis, scale(width, 0.74)])),
      whole: ellipsePath(ellipseOf(whole.middle, [whole.axis, width])),
    };
  });
};

/** Its head, neck, eyes, beak, snood and wattle. */
const headOf = (turkey: Turkey, frame: Frame) => {
  const { rig, snood, wattle } = turkey;
  const at = frame.place([rig.headX.x, rig.headY.x + turkey.tremble, 0]);
  const forward = frame.turn([1, 0, 0]);
  const up = frame.turn([0, 1, 0]);
  const left = frame.turn([0, 0, 1]);
  const local = (x: number, y: number, z = 0) =>
    add(at, add(add(scale(forward, x), scale(up, y)), scale(left, z)));
  // The neck: up from its breast and forward to its head, bowed as a bird's is.
  const root = frame.place(NECK);
  const bend = add(mix(root, at, 0.5), scale(forward, 4));
  const neck = linePath(curveOf(root, bend, local(-1, -3)));
  const eyes = [1, -1].flatMap((side, index) => {
    const out = normalize(frame.turn([0.3, 0.35, 0.88 * side]));
    const eye = add(at, scale(out, HEAD_R - 0.4));
    const [u, v] = tangentsOf(out);
    const shown = smooth((facing(out) - 0.05) / 0.25);
    const shut = rig.doze.x;
    return [
      [
        `eye-${index}`,
        {
          d: ellipsePath(ellipseOf(eye, [scale(u, 1.2), scale(v, 1.2)])),
          opacity: round(shown * (1 - shut)),
        },
      ],
      [
        `lid-${index}`,
        {
          d: linePath([add(eye, scale(u, 1.5)), add(eye, scale(u, -1.5))]),
          opacity: round(shown * shut),
        },
      ],
    ] as const;
  });
  const beak = hullPath([
    local(4.6, 1.2),
    local(4.6, -1),
    local(4.4, 0, 1.2),
    local(4.4, 0, -1.2),
    local(9.6, -0.6),
  ]);
  // The snood from above its beak, hanging over it, longer strutting; the wattle from its chin.
  const drape = (start: Vec3, swing: number, first: Vec3, second: Vec3) => {
    const turnBy = (v: Vec3) => apply(pitchOf(-swing), v);
    const middle = add(start, frame.turn(turnBy(first)));
    return linePath(curveOf(start, middle, add(middle, frame.turn(turnBy(second)))));
  };
  const snoodLength = 4 + 3 * frame.fan;
  const snoodPath = drape(local(3.2, 4), snood.angle, [3.4, -0.6, 0], [0.8, -snoodLength, 0]);
  const wattlePath = drape(local(1.4, -4.4), wattle.angle, [-0.4, -3.6, 0], [0.6, -3.2, 0]);
  return {
    at,
    beak,
    eyes,
    neck,
    snood: snoodPath,
    wattle: wattlePath,
  };
};

/** A leg (1 its left): hip to hock to foot, the hock bending back, and its toes. */
const legOf = (turkey: Turkey, frame: Frame, index: number) => {
  const hip = HIPS[index] ?? HIPS[0];
  const side = hip[2] > 0 ? 1 : -1;
  const step = footAt(turkey.walker, turkey.gait, index / 2, 7);
  // Worked out side on, in its own forward and up (with +y down, as the limb's solver takes it).
  const hipLocal = { x: hip[0], y: -(hip[1] + frame.rise) };
  const footLocal = { x: hip[0] + step.x / SIZE, y: step.y };
  const { end, joint } = limbOf(hipLocal, footLocal, THIGH, SHANK, -1);
  const placeFlat = (x: number, y: number) => apply(frame.yaw, [x, -y, side * 4.5]);
  const hipAt = placeFlat(hipLocal.x, hipLocal.y);
  const hock = placeFlat(joint.x, joint.y);
  const foot = placeFlat(end.x, end.y);
  // Three toes forward, curled as the foot's lifted, and one back.
  const curl = Math.min(1, -end.y / 6);
  const toes = [
    [6.5, 0],
    [5, 1.7],
    [5, -1.7],
    [-2.6, 0],
  ].map(([x = 0, z = 0]) => [
    foot,
    add(foot, apply(frame.yaw, [x * (1 - curl * 0.4), -curl * 3, z])),
  ]);
  return {
    depth: depthOf(hock),
    path: linePath([hipAt, hock, foot]) + linesPath(toes),
  };
};

export const turkeyPose = (turkey: Turkey): Pose => {
  const frame = frameOf(turkey);
  const body = bodyOf(frame);
  const torsoDepth = depthOf(body.center);
  const wings = ([1, -1] as const).map((side) => wingOf(frame, side));
  const feathers = feathersOf(frame);
  const head = headOf(turkey, frame);
  const legs = [0, 1].map((index) => legOf(turkey, frame, index));
  // The beard hangs from its breast, seen when its breast is.
  const breast = frame.place([18, 42, 0]);
  const beardShown = smooth((facing(frame.turn([1, -0.2, 0])) + 0.2) / 0.4);
  const parts = Object.fromEntries([
    ...solid("body", body.outline),
    ["beard", { d: linePath([breast, frame.place([18.6, 33, 0])]), opacity: round(beardShown) }],
    ...wings.flatMap(({ bars, outline }, index): [string, Part][] => [
      ...solid(`wing-${index}`, outline),
      [`bars-${index}`, { d: bars }],
    ]),
    ...feathers.flatMap(({ band, tip, whole }, index): [string, Part][] => [
      [`feather-${index}`, { d: whole }],
      [`band-${index}`, { d: band }],
      [`tip-${index}`, { d: tip }],
    ]),
    ["neck", { d: head.neck }],
    ...solid(
      "head",
      ellipseOf(
        head.at,
        axesOf({ center: head.at, radii: [HEAD_R, HEAD_R, HEAD_R], turn: frame.turn }),
      ),
    ),
    ...head.eyes,
    ["beak", { d: head.beak }],
    ["snood", { d: head.snood }],
    ["wattle", { d: head.wattle }],
    ...legs.map(({ path }, index) => [`leg-${index}`, { d: path }] as const),
  ]) satisfies Record<string, Part>;

  // Back to front: what's nearer the camera is drawn over. The head goes behind its body once it's turned away.
  const layers: [string, number][] = [
    ["torso", torsoDepth],
    ["head", torsoDepth + (depthOf(head.at) - torsoDepth) * 2],
    ...wings.map(({ depth }, index): [string, number] => [`wing-${index}`, depth]),
    ...feathers.map(({ depth }, index): [string, number] => [`feather-${index}`, depth]),
    ...legs.map(({ depth }, index): [string, number] => [`leg-${index}`, depth - 6]),
  ];
  const top = toScreen(head.at);
  const fanTop = toScreen(frame.place([TAIL[0], TAIL[1] + 34 * frame.fan, 0]));
  return {
    at: { x: turkey.walker.x, y: turkey.walker.y },
    bubble: { x: top.x, y: Math.min(top.y, fanTop.y) - 16 },
    order: layers.toSorted((a, b) => a[1] - b[1]).map(([name]) => name),
    parts,
    say: turkey.emotes.line,
  };
};
