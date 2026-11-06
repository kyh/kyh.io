// How the turkey (`turkey.ts`) looks this frame, built in the round and seen
// from a little above (`../follower/solid.ts`): a bronze body, its breast a
// deep round solid forward and low and its back sloping to its tail, puffed
// out strutting; a barred wing on each side, drooping as it struts; a tail of
// separate feathers, folded into a closed wedge sloping down behind it as it
// walks and rising into an upright fan, banded dark and tipped chestnut; a
// neck, feathered low and bare above, up to its bare blue head, held to its
// length; its eyes, its beak, its red snood and wattle swinging, a beard on
// its breast; and its legs, the feathered drumstick inside its body and the
// bare shank below, stepping to its feet where they're set down
// (`../follower/feet.ts`) on hocks that bend back. It turns to its heading;
// each part is a layer stacked by how near the camera it is. In its own
// pixels: x forward, y up, z to its left, its feet at the origin. Pure.
import type { Point } from "../follower/chain";
import type { Part, Pose } from "../follower/creature";
import type { Ellipse, Mat3, Vec3 } from "../follower/solid";
import type { Turkey } from "./turkey";
import { round } from "../art";
import { chainAbout, chainPath } from "../follower/chain";
import { footIn, groundSpeedOf, legTo } from "../follower/feet";
import {
  add,
  apply,
  axesOf,
  compose,
  cross,
  curveOf,
  depthOf,
  dot,
  ellipseOf,
  ellipsePath,
  facing,
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
  solidPaths,
  sub,
  tangentsOf,
  toScreen,
  TOWARD_CAMERA,
  yawOf,
} from "../follower/solid";

/**
 * How big it's drawn, to its own pixels: about the ghost's height. Its walk is
 * in screen pixels, so a foot's place on the ground is turned back into its own (`footIn`).
 */
export const SIZE = 0.7;
/** Its back and rump, and its breast: deep and round, forward and low. */
const BODY: Vec3 = [-4, 38, 0];
const BODY_RADII: Vec3 = [19, 14, 15];
const BREAST: Vec3 = [7, 34, 0];
const BREAST_RADII: Vec3 = [14, 14.5, 17.5];
/** Its body tipped up a little at the front, its back sloping down to its tail. */
const BREAST_UP = 0.1;
const WING: Vec3 = [-5, 38, 13.6];
const WING_RADII: Vec3 = [14, 7, 2.2];
/** The tail's root, inside the back of its body, and its feathers' length folded and fanned. */
const TAIL: Vec3 = [-15, 44, 0];
const TAIL_LENGTH = 44;
const FAN_LENGTH = 38;
export const FEATHERS = 11;
/** Where its neck comes out of its body, and its length to its head. */
const NECK: Vec3 = [9, 46, 0];
const NECK_LENGTH = 26;
const HEAD_R = 5.2;
/** Its hips, inside its body; the drumstick down from them to the hock, and the bare shank to the foot. */
const HIP: Vec3 = [1, 25, 4.5];
const DRUMSTICK = 13;
const SHANK = 15.5;
/** How far its knee, hidden in its body, swings forward or back toward a foot: its reach, past the leg's own. */
const KNEE_SWING = 7;
/** Its legs at the longest it stands them. */
const STRAIGHT = (DRUMSTICK + SHANK) * 0.97;
const COS = Math.cos(PITCH);

/** Its legs' feet in its own 3D, about where it stands. */
const feetOf = (turkey: Turkey) =>
  turkey.feet.feet.map((foot) => ({ at: footIn(foot, turkey.walker, SIZE), foot }));

/** Its knee, hidden in its body: swung toward its foot over the ground, forward, back or out. */
const kneeOf = (hip: Vec3, foot: Vec3) => {
  const across: Vec3 = [(foot[0] - hip[0]) * 0.4, 0, (foot[2] - hip[2]) * 0.4];
  const far = Math.hypot(across[0], across[2]);
  return add(hip, far > KNEE_SWING ? scale(across, KNEE_SWING / far) : across);
};

/**
 * How high its body rides: up a little as it walks, and never higher than
 * its legs reach down to its feet, so a long step lowers it rather than
 * stretching a leg off its foot.
 */
const riseOf = (turkey: Turkey, place: (local: Vec3) => Vec3, walking: number) => {
  let rise = 1.2 * walking;
  for (const [index, { at }] of feetOf(turkey).entries()) {
    const knee = kneeOf(place([HIP[0], HIP[1], index === 0 ? HIP[2] : -HIP[2]]), at);
    const across = Math.hypot(at[0] - knee[0], at[2] - knee[2]);
    const most = at[1] + Math.sqrt(Math.max(0, STRAIGHT * STRAIGHT - across * across));
    rise = Math.min(rise, most - knee[1]);
  }
  return Math.max(rise, -10);
};

/** Its frame this frame: how a point or a direction of its body is placed in the world. */
const frameOf = (turkey: Turkey) => {
  const { feet, rig } = turkey;
  const walking = smooth(groundSpeedOf(turkey.walker) / 30);
  const phase = feet.phase * Math.PI * 2;
  const ruffle = rig.ruffle.x;
  // Strutting, gobbling, it puffs out its feathers.
  const fan = Math.min(1, rig.fan.x);
  // Asleep, it breathes, slowly.
  const breath = Math.sin(turkey.time * 1.7) * 0.025 * rig.doze.x;
  const puff = 1 + 0.12 * fan + 0.08 * ruffle + breath;
  // Its body dips and tips a little as each foot comes down, and rides up over it.
  const step = (feet.phase * 2) % 1;
  const plant = ((1 + Math.cos(step * Math.PI * 2)) / 2) * walking;
  // It sways from foot to foot as it walks, and shivers its feathers up as it gobbles.
  const sway = Math.sin(phase) * 0.04 * walking + Math.sin(turkey.time * 41) * 0.06 * ruffle;
  // Strutting, it leans back, breast out; pecking, it bows.
  const lean = BREAST_UP + 0.1 * fan - rig.bow.x - 0.04 * plant;
  const body = compose(pitchOf(lean), rollOf(sway));
  const yaw = yawOf(rig.heading.x);
  const pivot: Vec3 = [0, 26, 0];
  const ahead = apply(yaw, [1, 0, 0]);
  const settled = (local: Vec3): Vec3 => apply(yaw, add(apply(body, sub(local, pivot)), pivot));
  // Dozing, it sits down on its folded legs; bowing to peck, it crouches a little.
  const drop = 20 * rig.doze.x + 3 * rig.bow.x + 1.8 * plant;
  const rise = riseOf(turkey, settled, walking) - drop;
  const turn = (direction: Vec3): Vec3 => apply(yaw, apply(body, direction));
  const place = (local: Vec3): Vec3 => add(settled(local), [0, rise, 0]);
  return { ahead, body, doze: rig.doze.x, fan, place, puff, rise, ruffle, turn, walking, yaw };
};

type Frame = ReturnType<typeof frameOf>;

/** How much a direction faces the camera: -1 away to 1 toward. */
const toward = (direction: Vec3) => dot(direction, TOWARD_CAMERA);

const solid = (name: string, outline: Ellipse): [string, Part][] => {
  const { lit, whole } = solidPaths(outline);
  return [
    [name, { d: whole }],
    [`${name}-lit`, { d: lit }],
  ];
};

/** An ellipsoid of its body, puffed up strutting. */
const massOf = ({ place, turn }: Frame, center: Vec3, radii: Vec3, puff: number) => {
  const at = place(center);
  const scaled: Vec3 = [radii[0] * puff, radii[1] * puff, radii[2] * puff];
  return { at, outline: ellipseOf(at, axesOf({ center: at, radii: scaled, turn })) };
};

/** Its body: its back, and its breast puffed out the most. */
const bodyOf = (frame: Frame) => {
  const back = massOf(frame, BODY, BODY_RADII, frame.puff);
  const breastPuff = frame.puff + 0.1 * frame.fan;
  const breast = massOf(frame, add(BREAST, [2.5 * frame.fan, 0, 0]), BREAST_RADII, breastPuff);
  return { back, breast, center: mix(back.at, breast.at, 0.5) };
};

/** A wing (1 its left): a flat solid on its side, barred pale; drooping, its tip to the ground, as it struts. */
const wingOf = ({ ahead, fan, place, turn }: Frame, side: 1 | -1) => {
  const droop = compose(pitchOf(0.08 - 0.36 * fan), rollOf(0.14 * side * fan));
  const center = place([WING[0], WING[1] - 5 * fan, WING[2] * side * (1 + 0.1 * fan)]);
  const axes = WING_RADII.map((radius, index) =>
    apply(droop, [index === 0 ? radius : 0, index === 1 ? radius : 0, index === 2 ? radius : 0]),
  );
  // Its barring: short pale bars across its flight feathers, back and low on the wing.
  const on = (x: number, y: number) =>
    add(center, turn(apply(droop, [x, y, side * WING_RADII[2]])));
  const bars = linesPath([-2.5, -5.6, -8.7, -11.8].map((x) => [on(x, -7.5), on(x - 1.5, 0.5)]));
  return {
    bars,
    // Over its body only as its side turns to the camera: edge on, it's behind its breast and back.
    // By its heading alone, so its sway doesn't flick it over and under.
    facing: toward(scale([-ahead[2], 0, ahead[0]], side)),
    outline: ellipseOf(center, axes.map(turn)),
  };
};

/** Where a tail feather lies and how it's turned: `s` from its right edge (-1) to its left (1). */
const featherAxes = (s: number, opened: number) => {
  // Folded, a closed wedge sloping down behind: the middle feathers on top, the outer ones lapped
  // under them down each side, like a roof. Fanned, an upright half wheel.
  const folded = normalize([-1, -0.36 - 0.06 * Math.abs(s), 0.14 * s]);
  const spread = s * 0.5 * Math.PI * 0.95;
  const fanned = normalize([-0.3, Math.cos(spread), Math.sin(spread)]);
  const roof = normalize([0, Math.cos(0.55 * s), Math.sin(0.55 * s)]);
  const direction = normalize(mix(folded, fanned, opened));
  const plane = normalize(mix(roof, [1, 0, 0], opened));
  const offset = scale([0, -1.2 * Math.abs(s), 5.5 * s], 1 - opened);
  return { direction, offset, plane };
};

/** Its tail feathers: folded in a closed wedge, rising to stand in an upright fan. */
const feathersOf = ({ fan, place, turn }: Frame) => {
  const opened = smooth(fan);
  const root = place(add(TAIL, [0, 3 * opened, 0]));
  return Array.from({ length: FEATHERS }, (_, index) => {
    const s = (index / (FEATHERS - 1)) * 2 - 1;
    const { direction, offset, plane } = featherAxes(s, opened);
    const base = add(root, turn(offset));
    // Folded, the middle feathers longest: it tapers to a point.
    const folded = TAIL_LENGTH * (1 - 0.32 * s * s);
    const length = folded + (FAN_LENGTH - folded) * opened;
    const across = normalize(cross(direction, plane));
    // Broad, lapping its neighbors: a closed wedge folded, a solid fan open.
    const width = scale(turn(across), 4 + 2.4 * opened);
    const along = (from: number, to: number) => {
      const middle = add(base, turn(scale(direction, length * ((from + to) / 2))));
      return { axis: turn(scale(direction, (length * (to - from)) / 2)), middle };
    };
    // From inside its body out: broadest past halfway, as a tail feather is.
    const whole = along(0.2, 1);
    const band = along(0.64, 1);
    const tip = along(0.82, 1);
    return {
      band: ellipsePath(ellipseOf(band.middle, [band.axis, scale(width, 0.86)])),
      edge: Math.abs(s),
      tip: ellipsePath(ellipseOf(tip.middle, [tip.axis, scale(width, 0.74)])),
      whole: ellipsePath(ellipseOf(whole.middle, [whole.axis, width])),
    };
  });
};

/** Links in each of its snood, wattle and beard. */
const FLESH_LINKS = 5;

/** Its head's frame: where it is, held to its neck's length, and how it's turned and nodded. */
const headFrameOf = (turkey: Turkey, frame: Frame) => {
  const { rig, shake } = turkey;
  // It holds its head steadier than its body, but sits it down with it asleep.
  const steady = 0.6 + 0.4 * rig.doze.x;
  const upright = (local: Vec3): Vec3 => add(apply(frame.yaw, local), [0, frame.rise * steady, 0]);
  const goal = upright([rig.headX.x + turkey.bob + shake.x, rig.headY.x + shake.y, 0]);
  const root = frame.place(NECK);
  // Its neck keeps about its length: the head goes where it's put, as far as its neck lets it.
  const reach = sub(goal, root);
  const length = Math.hypot(reach[0], reach[1], reach[2]) || 1;
  const least = NECK_LENGTH * (0.8 - 0.7 * rig.doze.x);
  // Walking it gives a little as its head's held back; pecking it stretches out to the ground.
  const most = NECK_LENGTH * (1.08 + 0.12 * frame.walking + 0.5 * turkey.reach);
  const kept = Math.max(least, Math.min(most, length));
  const at = add(root, scale(reach, kept / length));
  const turned: Mat3 = compose(
    frame.yaw,
    compose(yawOf(rig.look.x + shake.turn), pitchOf(rig.nod.x)),
  );
  return { at, root, turned };
};

/** Its neck: out of its body, up then over to its head (out then down, pecking), its bare skin above its feathers. */
const neckOf = (root: Vec3, head: Vec3, attach: Vec3) => {
  const reach = sub(head, root);
  const length = Math.hypot(reach[0], reach[1], reach[2]) || 1;
  const down = smooth(0.5 - (reach[1] / length) * 1.5);
  const flat: Vec3 = [reach[0], 0, reach[2]];
  const bend = add(add(root, scale(flat, 0.25 + 0.5 * down)), [
    0,
    reach[1] * (0.8 - 0.55 * down),
    0,
  ]);
  const curve = curveOf(root, bend, attach, 6);
  return { low: linePath(curve.slice(0, 4)), whole: linePath(curve) };
};

/** Its head, neck, eyes and beak, and where its snood and wattle hang from it at rest. */
const headOf = (turkey: Turkey, frame: Frame) => {
  const { rig } = turkey;
  const { at, root, turned } = headFrameOf(turkey, frame);
  const local = (x: number, y: number, z = 0) => add(at, apply(turned, [x, y, z]));
  const neck = neckOf(root, at, local(-1.6, -2.6));
  const eyes = [1, -1].flatMap((side, index) => {
    const out = normalize(apply(turned, [0.3, 0.35, 0.88 * side]));
    const eye = add(at, scale(out, HEAD_R - 0.4));
    const [u, v] = tangentsOf(out);
    const shown = smooth((facing(out) - 0.05) / 0.25);
    const shut = rig.doze.x;
    return [
      [
        `eye-${index}`,
        {
          d: ellipsePath(ellipseOf(eye, [scale(u, 1.15), scale(v, 1.15)])),
          opacity: round(shown * (1 - shut)),
        },
      ],
      [
        `lid-${index}`,
        {
          d: linePath([add(eye, scale(u, 1.4)), add(eye, scale(u, -1.4))]),
          opacity: round(shown * shut),
        },
      ],
    ] as const;
  });
  const beak = hullPath([
    local(4.2, 1.2),
    local(4.2, -1.3),
    local(4, 0, 1.3),
    local(4, 0, -1.3),
    local(9, -0.6),
    local(8.6, -1.6),
  ]);
  // The snood from its brow, over its beak and hanging past it, longer strutting; the wattle from its throat.
  const down: Vec3 = [0, -1, 0];
  const hang = (start: Vec3, over: Vec3, length: number) => {
    const middle = add(start, apply(turned, over));
    const forward = scale(frame.ahead, 0.12);
    return [
      start,
      middle,
      ...Array.from({ length: FLESH_LINKS - 1 }, (_, index) =>
        add(middle, scale(add(down, forward), (length * (index + 1)) / (FLESH_LINKS - 1))),
      ),
    ];
  };
  const snoodLength = 6 + 5 * frame.fan;
  return {
    at,
    beak,
    eyes,
    forward: apply(turned, [1, 0, 0]),
    neck,
    root,
    snood: hang(local(3.7, 1.9), [1.8, 0.1, 0], snoodLength),
    wattle: hang(local(1.2, -4.2), [-0.4, -1.6, 0], 6.5),
  };
};

/** Where its beard grows: the front of its breast, a little below the most forward of it, hanging out clear below. */
const BEARD: Vec3 = [BREAST[0] + BREAST_RADII[0] - 2, BREAST[1] - 3, 0];
const BEARD_LENGTH = 11.5;

/** Its beard: a tuft of coarse hair hanging from the front of its breast, clear of it. */
const beardOf = (frame: Frame) => {
  const root = frame.place(add(BEARD, [2.5 * frame.fan, 0, 0]));
  return Array.from({ length: FLESH_LINKS + 1 }, (_, index): Vec3 =>
    add(root, add(scale(frame.ahead, index * 1.5), [0, (-index * BEARD_LENGTH) / FLESH_LINKS, 0])),
  );
};

/** A chain's knots from `from` out to its tip as a path, about where it stands: a beard's brush end. */
const tipPath = (chain: Turkey["beard"], origin: Point, from: number) =>
  chainAbout(chain, origin, SIZE)
    .slice(from)
    .map((p, index) => `${index === 0 ? "M" : "L"}${round(p.x)} ${round(p.y)}`)
    .join("");

/** Where a hanging part's root is, on the screen, and the ground straight under it there. */
const hanging = (points: readonly Vec3[]) => {
  const [root = [0, 0, 0]] = points;
  return { floor: toScreen(root).y + root[1] * COS, points: points.map(toScreen) };
};

/**
 * Where its snood, wattle and beard hang at rest this frame, each root first,
 * in its own pixels about where it stands, and the ground under each (its
 * own pixels down the screen): the chains (`turkey.ts`) are pulled toward
 * them, and the air and their swing do the rest.
 */
export const fleshOf = (
  turkey: Turkey,
): Record<"beard" | "snood" | "wattle", { floor: number; points: Point[] }> => {
  const frame = frameOf(turkey);
  const { snood, wattle } = headOf(turkey, frame);
  return { beard: hanging(beardOf(frame)), snood: hanging(snood), wattle: hanging(wattle) };
};

/** A leg (0 its left): the drumstick down out of its body to the hock, bending back, the shank to its foot, and its toes. */
const legOf = (turkey: Turkey, frame: Frame, index: number) => {
  const placed = feetOf(turkey)[index];
  const side = index === 0 ? 1 : -1;
  const hip = frame.place([HIP[0], HIP[1], HIP[2] * side]);
  const foot = placed?.at ?? [0, 0, 0];
  const knee = kneeOf(hip, foot);
  const { end, joint } = legTo(knee, foot, DRUMSTICK, SHANK, scale(frame.ahead, -1));
  // Three toes forward, curled as the foot's lifted, and one back, along the way it was set down.
  const turn = placed?.foot.turn ?? 0;
  const pointing: Vec3 = [Math.cos(turn), 0, Math.sin(turn)];
  const left: Vec3 = [-Math.sin(turn), 0, Math.cos(turn)];
  const curl = Math.min(1, (end[1] ?? 0) / 5);
  const toes = [
    [6.2, 0],
    [4.8, 1.9],
    [4.8, -1.9],
    [-2.6, 0],
  ].map(([x = 0, z = 0]) => [
    end,
    add(end, add(add(scale(pointing, x * (1 - curl * 0.45)), scale(left, z)), [0, -curl * 2.6, 0])),
  ]);
  return {
    depth: depthOf(joint),
    drumstick: linePath([knee, joint]),
    shank: linePath([joint, end]),
    toes: linesPath(toes),
  };
};

/** Its legs: lit the nearer the camera, shaded the farther, crossing over smoothly. */
const legsOf = (turkey: Turkey, frame: Frame) => {
  const legs = [0, 1].map((index) => legOf(turkey, frame, index));
  const [first, second] = legs;
  const ahead = (first?.depth ?? 0) - (second?.depth ?? 0);
  return legs.map((leg, index) => ({
    ...leg,
    lit: round(smooth(0.5 + ((index === 0 ? ahead : -ahead) / 4) * 0.5)),
  }));
};

/**
 * Its layers back to front: what's nearer the camera is drawn over. Its
 * tail goes over or under its body whole, by which way it faces (held a
 * little past side on, `turkey.ts`), its feathers lapped in a fixed order.
 * Its head and face, beard and wings go by which way it faces, not by the
 * sway and bob of each, so none flickers over and under another.
 */
const layersOf = (
  turkey: Turkey,
  frame: Frame,
  drawn: {
    feathers: readonly { edge: number }[];
    head: { at: Vec3; forward: Vec3 };
    legs: readonly { depth: number }[];
    torsoDepth: number;
    wings: readonly { facing: number }[];
  },
) => {
  const { feathers, legs, torsoDepth, wings } = drawn;
  const front = toward(frame.ahead);
  // Its neck comes out of the top of its breast: over its body only seen from the front.
  const neckDepth = torsoDepth + 4 * (front - 0.3) + (front > 0.3 ? 0.03 : 0);
  // Its head over its body, but beyond it facing away; asleep, half sunk in the feathers of its back.
  let headDepth = Math.max(torsoDepth + 0.3, neckDepth + 0.01);
  if (frame.doze > 0.5) {
    headDepth = torsoDepth - 0.05;
  } else if (front < -0.35) {
    headDepth = torsoDepth - 0.3;
  }
  // Its face (beak, snood, wattle) over its head facing the camera, behind its head and neck turned away.
  const away = toward(drawn.head.forward) < -0.25 || frame.doze > 0.5;
  const faceDepth = away ? Math.min(neckDepth, headDepth) - 0.01 : headDepth + 0.01;
  // Its beard on its breast: over its body unless its breast's turned away, and under its head and face.
  // Its neck over its body (seen from the front) is over its beard too.
  let beardOnBody = front > -0.15 ? torsoDepth + 0.2 : torsoDepth - 0.2;
  if (front > 0.3) {
    beardOnBody = torsoDepth + 0.01;
  }
  const beardDepth = Math.min(beardOnBody, headDepth - 0.02);
  const tailDepth = turkey.tailNear ? torsoDepth + 0.5 : torsoDepth - 2;
  const layers: [string, number][] = [
    ["torso", torsoDepth],
    ["beard", beardDepth],
    ["neck", neckDepth],
    ["head", headDepth],
    ["face", faceDepth],
    ...wings.map(({ facing: side }, index): [string, number] => [
      `wing-${index}`,
      torsoDepth + 6 * (side - 0.4) + index * 1e-3,
    ]),
    // Its tail feathers lapped the middle over the outer, as they lie folded, and as a fan's do.
    ...feathers.map(({ edge }, index): [string, number] => [
      `feather-${index}`,
      tailDepth + (1 - edge + index * 1e-3) * 1e-2,
    ]),
    // Its legs come out from under its body, always behind it: the nearer over the farther.
    ...legs.map(({ depth }, index): [string, number] => [
      `leg-${index}`,
      torsoDepth - 1 + (depth - torsoDepth) * 0.01,
    ]),
  ];
  return layers.toSorted((a, b) => a[1] - b[1]).map(([name]) => name);
};

export const turkeyPose = (turkey: Turkey): Pose => {
  const frame = frameOf(turkey);
  const body = bodyOf(frame);
  const torsoDepth = depthOf(body.center);
  const wings = ([1, -1] as const).map((side) => wingOf(frame, side));
  const feathers = feathersOf(frame);
  const head = headOf(turkey, frame);
  const legs = legsOf(turkey, frame);
  const neckShown = round(1 - smooth(turkey.rig.doze.x * 1.6));
  const beardShown = round(1 - smooth(turkey.rig.doze.x * 1.4));
  const parts = Object.fromEntries([
    ...solid("body", body.back.outline),
    ...solid("breast", body.breast.outline),
    // Sat down asleep, its beard's on the ground under its breast.
    ["beard", { d: chainPath(turkey.beard, turkey.walker, SIZE), opacity: beardShown }],
    ["beard-mid", { d: tipPath(turkey.beard, turkey.walker, 2), opacity: beardShown }],
    ["beard-tip", { d: tipPath(turkey.beard, turkey.walker, 4), opacity: beardShown }],
    ...wings.flatMap(({ bars, outline }, index): [string, Part][] => [
      ...solid(`wing-${index}`, outline),
      [`bars-${index}`, { d: bars }],
    ]),
    ...feathers.flatMap(({ band, tip, whole }, index): [string, Part][] => [
      [`feather-${index}`, { d: whole }],
      [`band-${index}`, { d: band }],
      [`tip-${index}`, { d: tip }],
    ]),
    ["neck", { d: head.neck.whole, opacity: neckShown }],
    ["neck-low", { d: head.neck.low, opacity: neckShown }],
    ...solid(
      "head",
      ellipseOf(head.at, [
        [HEAD_R, 0, 0],
        [0, HEAD_R, 0],
        [0, 0, HEAD_R],
      ]),
    ),
    ...head.eyes,
    ["beak", { d: head.beak }],
    ["snood", { d: chainPath(turkey.snood, turkey.walker, SIZE) }],
    ["wattle", { d: chainPath(turkey.wattle, turkey.walker, SIZE) }],
    ...legs.flatMap(({ drumstick, lit, shank, toes }, index): [string, Part][] => [
      [`drumstick-${index}`, { d: drumstick }],
      [`shank-${index}`, { d: shank }],
      [`toes-${index}`, { d: toes }],
      [`shank-lit-${index}`, { d: shank, opacity: lit }],
      [`toes-lit-${index}`, { d: toes, opacity: lit }],
    ]),
  ]) satisfies Record<string, Part>;

  const layers = layersOf(turkey, frame, { feathers, head, legs, torsoDepth, wings });
  const top = toScreen(head.at);
  const fanTop = toScreen(frame.place([TAIL[0], TAIL[1] + 36 * frame.fan, 0]));
  return {
    at: { x: turkey.walker.x, y: turkey.walker.y },
    bubble: { x: top.x, y: Math.min(top.y, fanTop.y) - 16 },
    order: layers,
    parts,
    say: turkey.emotes.line,
  };
};
