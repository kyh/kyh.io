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
const BODY: Vec3 = [-4, 38, 0];
const BODY_RADII: Vec3 = [19, 14, 15];
const BREAST: Vec3 = [7, 34, 0];
const BREAST_RADII: Vec3 = [14, 14.5, 17.5];
const BREAST_UP = 0.1;
const WING: Vec3 = [-5, 39.5, 16.5];
const WING_RADII: Vec3 = [14, 6, 2.2];
const TAIL: Vec3 = [-15, 44, 0];
const TAIL_LENGTH = 44;
const FAN_LENGTH = 38;
export const FEATHERS = 11;
const NECK: Vec3 = [9, 46, 0];
const NECK_LENGTH = 26;
const HEAD_R = 5.2;
const HIP: Vec3 = [1, 25, 4.5];
const DRUMSTICK = 13;
const SHANK = 15.5;
const KNEE_SWING = 7;
const STRAIGHT = (DRUMSTICK + SHANK) * 0.97;
const COS = Math.cos(PITCH);

const feetOf = (turkey: Turkey) =>
  turkey.feet.feet.map((foot) => ({ at: footIn(foot, turkey.walker, SIZE), foot }));

const kneeOf = (hip: Vec3, foot: Vec3) => {
  const across: Vec3 = [(foot[0] - hip[0]) * 0.4, 0, (foot[2] - hip[2]) * 0.4];
  const far = Math.hypot(across[0], across[2]);

  return add(hip, far > KNEE_SWING ? scale(across, KNEE_SWING / far) : across);
};

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

const frameOf = (turkey: Turkey) => {
  const { feet, rig } = turkey;
  const walking = smooth(groundSpeedOf(turkey.walker) / 30);
  const phase = feet.phase * Math.PI * 2;
  const ruffle = rig.ruffle.x;
  const fan = Math.min(1, rig.fan.x);
  const breath = Math.sin(turkey.time * 1.7) * 0.025 * rig.doze.x;
  const puff = 1 + 0.12 * fan + 0.08 * ruffle + breath;
  const step = (feet.phase * 2) % 1;
  const plant = ((1 + Math.cos(step * Math.PI * 2)) / 2) * walking;
  const sway = Math.sin(phase) * 0.04 * walking + Math.sin(turkey.time * 41) * 0.06 * ruffle;
  const lean = BREAST_UP + 0.1 * fan - rig.bow.x - 0.04 * plant;
  const body = compose(pitchOf(lean), rollOf(sway));
  const yaw = yawOf(rig.heading.x);
  const pivot: Vec3 = [0, 26, 0];
  const ahead = apply(yaw, [1, 0, 0]);
  const settled = (local: Vec3) => apply(yaw, add(apply(body, sub(local, pivot)), pivot));
  const drop = 20 * rig.doze.x + 3 * rig.bow.x + 1.8 * plant;
  const air = Math.min(...feet.feet.map((foot) => foot.lift)) / SIZE;
  const rise = riseOf(turkey, settled, walking) - drop + 0.8 * Math.max(0, air);
  const turn = (direction: Vec3) => apply(yaw, apply(body, direction));
  const place = (local: Vec3) => add(settled(local), [0, rise, 0]);

  return { ahead, body, fan, place, puff, rise, ruffle, turn, walking, yaw };
};

type Frame = ReturnType<typeof frameOf>;

const toward = (direction: Vec3) => dot(direction, TOWARD_CAMERA);

const solid = (name: string, outline: Ellipse) => {
  const { lit, whole } = solidPaths(outline);

  return [
    [name, { d: whole }],
    [`${name}-lit`, { d: lit }],
  ] satisfies [string, Part][];
};

const massOf = ({ place, turn }: Frame, center: Vec3, radii: Vec3, puff: number) => {
  const at = place(center);
  const scaled: Vec3 = [radii[0] * puff, radii[1] * puff, radii[2] * puff];

  return { at, outline: ellipseOf(at, axesOf({ center: at, radii: scaled, turn })) };
};

const bodyOf = (frame: Frame) => {
  const back = massOf(frame, BODY, BODY_RADII, frame.puff);
  const breastPuff = frame.puff + 0.1 * frame.fan;
  const breast = massOf(frame, add(BREAST, [2.5 * frame.fan, 0, 0]), BREAST_RADII, breastPuff);

  return { back, breast, center: mix(back.at, breast.at, 0.5) };
};

const PRIMARIES = 4;
const OVER_BODY = 0.4;
const OVER_HELD = 0.04;

/** Whether a wing (1 its left) is over its body, after whether it was: by its heading alone, so its sway can't flick it. */
export const wingOverOf = (was: boolean, heading: number, side: 1 | -1) =>
  toward([-Math.sin(heading) * side, 0, Math.cos(heading) * side]) >
  OVER_BODY + (was ? -OVER_HELD : OVER_HELD);

const wingOf = ({ ahead, fan, place, puff, turn }: Frame, side: 1 | -1) => {
  const droop = compose(pitchOf(0.08 + 0.42 * fan), rollOf(0.12 * fan * side));
  const out = WING[2] * (puff + 0.08 * fan);
  const center = place([WING[0], WING[1] - 7 * fan, out * side]);

  const local = (x: number, y: number, z = 0) => add(center, turn(apply(droop, [x, y, z * side])));

  const [length, height, thick] = WING_RADII;

  const axes = [
    [length, 0, 0],
    [0, height, 0],
    [0, 0, thick],
  ].map((axis) => turn(apply(droop, [axis[0] ?? 0, axis[1] ?? 0, (axis[2] ?? 0) * side])));

  const edge = linePath(
    Array.from({ length: 13 }, (_, index) => {
      const angle = Math.PI * (1 + (0.85 * index) / 12);

      return local(length * Math.cos(angle), height * Math.sin(angle), thick);
    }),
  );

  const shown = toward(scale([-ahead[2], 0, ahead[0]], side));
  const flat = 0.3 + 0.7 * smooth(shown / 0.6);
  const drawnOut = smooth((shown - OVER_BODY) / 0.25);

  const primaries = Array.from({ length: PRIMARIES }, (_, index) => {
    const root = local(-7 - index * 0.8, 0.5 - index * 1.3, thick * 0.6);
    const along = turn(apply(droop, [-1, 0.06 - index * 0.04, 0]));
    const reach = 16 - index * 1.2;
    const middle = add(root, scale(along, (reach * drawnOut) / 2));
    const across = turn(apply(droop, [0, 1.15 * flat, 0]));

    const bars = [0.55, 0.8].map((at) => {
      const on = add(root, scale(along, reach * at));

      return [add(on, scale(across, 1.6)), add(on, scale(across, -1.6))];
    });

    return {
      bars,
      path: ellipsePath(ellipseOf(middle, [scale(along, (reach * drawnOut) / 2), across])),
    };
  });

  return {
    bars: linesPath(primaries.flatMap(({ bars }) => bars)),
    drawnOut,
    edge,
    facing: shown,
    outline: ellipseOf(center, axes),
    primaries: primaries.map(({ path }) => path).join(""),
  };
};

const featherAxes = (s: number, opened: number, level: number) => {
  const folded = normalize([-1, -0.5 - 0.06 * Math.abs(s) + 0.65 * level, 0.14 * s]);
  const spread = s * 0.5 * Math.PI * 0.95;
  const fanned = normalize([-0.3, Math.cos(spread), Math.sin(spread)]);
  const roof = normalize([0, Math.cos(0.55 * s), Math.sin(0.55 * s)]);
  const direction = normalize(mix(folded, fanned, opened));
  const plane = normalize(mix(roof, [1, 0, 0], opened));
  const offset = scale([0, -1.2 * Math.abs(s), 5.5 * s], 1 - opened);

  return { direction, offset, plane };
};

const feathersOf = ({ ahead, fan, place, turn }: Frame) => {
  const opened = smooth(fan);
  const level = smooth(-ahead[2] / 0.8);
  const root = place(add(TAIL, [0, 3 * opened, 0]));

  return Array.from({ length: FEATHERS }, (_, index) => {
    const s = (index / (FEATHERS - 1)) * 2 - 1;
    const { direction, offset, plane } = featherAxes(s, opened, level);
    const base = add(root, turn(offset));
    const folded = TAIL_LENGTH * (1 - 0.32 * s * s);
    const length = folded + (FAN_LENGTH - folded) * opened;
    const across = normalize(cross(direction, plane));
    const width = scale(turn(across), 4 + 2.4 * opened);

    const along = (from: number, to: number) => {
      const middle = add(base, turn(scale(direction, length * ((from + to) / 2))));

      return { axis: turn(scale(direction, (length * (to - from)) / 2)), middle };
    };

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

const FLESH_LINKS = 5;

const headFrameOf = (turkey: Turkey, frame: Frame) => {
  const { rig, shake } = turkey;
  const steady = 0.6 + 0.4 * rig.doze.x;
  const upright = (local: Vec3) => add(apply(frame.yaw, local), [0, frame.rise * steady, 0]);
  const goal = upright([rig.headX.x + turkey.bob + shake.x, rig.headY.x + shake.y, 0]);
  const root = frame.place(NECK);
  const reach = sub(goal, root);
  const length = Math.hypot(reach[0], reach[1], reach[2]) || 1;
  const away = Math.max(0, -frame.ahead[2]);
  const least = NECK_LENGTH * (0.8 - 0.35 * away - 0.7 * rig.doze.x);
  const across = 1 - Math.abs(frame.ahead[2]);
  const most = NECK_LENGTH * (1.08 + 0.12 * frame.walking * across + 0.5 * turkey.reach);
  const kept = Math.max(least, Math.min(most, length));
  const at = add(root, scale(reach, kept / length));

  const turned: Mat3 = compose(
    frame.yaw,
    compose(yawOf(rig.look.x + shake.turn), pitchOf(rig.nod.x)),
  );

  return { at, root, turned };
};

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

  return {
    base: linePath(curve.slice(0, 3)),
    low: linePath(curve.slice(0, 5)),
    whole: linePath(curve),
  };
};

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
    neck,
    root,
    snood: hang(local(3.7, 1.9), [1.8, 0.1, 0], snoodLength),
    wattle: hang(local(1.2, -4.2), [-0.4, -1.6, 0], 6.5),
  };
};

const BEARD: Vec3 = [BREAST_RADII[0] * 0.45, BREAST_RADII[1] * 0.89, 0];
const BEARD_LENGTH = 9;

const beardOf = (frame: Frame) => {
  const puffed = scale(BEARD, frame.puff + 0.1 * frame.fan);
  const root = frame.place(add(add(BREAST, puffed), [2.5 * frame.fan, 0, 0]));

  return Array.from({ length: FLESH_LINKS + 1 }, (_, index) =>
    add(root, add(scale(frame.ahead, index * 1.1), [0, (-index * BEARD_LENGTH) / FLESH_LINKS, 0])),
  );
};

const tipPath = (chain: Turkey["beard"], origin: Point, from: number) =>
  chainAbout(chain, origin, SIZE)
    .slice(from)
    .map((p, index) => `${index === 0 ? "M" : "L"}${round(p.x)} ${round(p.y)}`)
    .join("");

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
export const fleshOf = (turkey: Turkey) => {
  const frame = frameOf(turkey);
  const { snood, wattle } = headOf(turkey, frame);

  return {
    beard: hanging(beardOf(frame)),
    snood: hanging(snood),
    wattle: hanging(wattle),
  } satisfies Record<"beard" | "snood" | "wattle", { floor: number; points: Point[] }>;
};

const legOf = (turkey: Turkey, frame: Frame, index: number) => {
  const placed = feetOf(turkey)[index];
  const side = index === 0 ? 1 : -1;
  const hip = frame.place([HIP[0], HIP[1], HIP[2] * side]);
  const foot = placed?.at ?? [0, 0, 0];
  const knee = kneeOf(hip, foot);
  const { end, joint } = legTo(knee, foot, DRUMSTICK, SHANK, scale(frame.ahead, -1));
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

const legsOf = (turkey: Turkey, frame: Frame) => {
  const legs = [0, 1].map((index) => legOf(turkey, frame, index));
  const [first, second] = legs;
  const ahead = (first?.depth ?? 0) - (second?.depth ?? 0);

  return legs.map((leg, index) => ({
    ...leg,
    lit: round(smooth(0.5 + ((index === 0 ? ahead : -ahead) / 4) * 0.5)),
  }));
};

const layersOf = (
  turkey: Turkey,
  frame: Frame,
  drawn: {
    feathers: readonly { edge: number }[];
    legs: readonly { depth: number }[];
    torsoDepth: number;
    wings: readonly { facing: number }[];
  },
) => {
  const { feathers, legs, torsoDepth, wings } = drawn;
  const front = toward(frame.ahead);
  const neckDepth = torsoDepth - 0.5;
  const headDepth = front < -0.35 ? torsoDepth - 0.3 : torsoDepth + 0.3;
  const faceDepth = turkey.faceAway ? Math.min(neckDepth, headDepth) - 0.01 : headDepth + 0.01;

  const beardDepth = Math.min(
    front > -0.15 ? torsoDepth + 0.2 : torsoDepth - 0.2,
    headDepth - 0.02,
  );

  const tailDepth = turkey.tailNear ? torsoDepth + 0.5 : torsoDepth - 2;

  const layers: [string, number][] = [
    ["torso", torsoDepth],
    ["beard", beardDepth],
    ["neck", neckDepth],
    ["head", headDepth],
    ["face", faceDepth],
    ...wings.map(
      ({ facing: side }, index) =>
        [
          `wing-${index}`,
          torsoDepth +
            (turkey.wingOver[index] ? 1 : -1) * (0.01 + 6 * Math.abs(side - OVER_BODY)) +
            index * 1e-3,
        ] satisfies [string, number],
    ),
    ...feathers.map(
      ({ edge }, index) =>
        [`feather-${index}`, tailDepth + (1 - edge + index * 1e-3) * 1e-2] satisfies [
          string,
          number,
        ],
    ),
    ...legs.map(
      ({ depth }, index) =>
        [`leg-${index}`, torsoDepth - 1 + (depth - torsoDepth) * 0.01] satisfies [string, number],
    ),
  ];

  return layers.toSorted((a, b) => a[1] - b[1]).map(([name]) => name);
};

export const turkeyPose = (turkey: Turkey) => {
  const frame = frameOf(turkey);
  const body = bodyOf(frame);
  const torsoDepth = depthOf(body.center);
  const wings = ([1, -1] as const).map((side) => wingOf(frame, side));
  const feathers = feathersOf(frame);
  const head = headOf(turkey, frame);
  const legs = legsOf(turkey, frame);
  const neckShown = round(1 - smooth((turkey.rig.doze.x - 0.45) * 2.5));
  const beardShown = round(1 - smooth(turkey.rig.doze.x * 1.4));

  const parts = Object.fromEntries([
    ...solid("body", body.back.outline),
    ...solid("breast", body.breast.outline),
    ["beard", { d: chainPath(turkey.beard, turkey.walker, SIZE), opacity: beardShown }],
    ["beard-mid", { d: tipPath(turkey.beard, turkey.walker, 2), opacity: beardShown }],
    ["beard-tip", { d: tipPath(turkey.beard, turkey.walker, 4), opacity: beardShown }],
    ...wings.flatMap(
      ({ bars, drawnOut, edge, outline, primaries }, index) =>
        [
          ...solid(`wing-${index}`, outline),
          [
            `wing-ink-${index}`,
            { d: ellipsePath(outline), opacity: turkey.wingOver[index] ? 0 : 1 },
          ],
          [`wing-edge-${index}`, { d: edge, opacity: turkey.wingOver[index] ? 1 : 0 }],
          [`primaries-${index}`, { d: primaries, opacity: drawnOut > 0 ? 1 : 0 }],
          [`bars-${index}`, { d: bars, opacity: drawnOut > 0 ? 1 : 0 }],
        ] satisfies [string, Part][],
    ),
    ...feathers.flatMap(
      ({ band, tip, whole }, index) =>
        [
          [`feather-${index}`, { d: whole }],
          [`band-${index}`, { d: band }],
          [`tip-${index}`, { d: tip }],
        ] satisfies [string, Part][],
    ),
    ["neck", { d: head.neck.whole, opacity: neckShown }],
    ["neck-low", { d: head.neck.low, opacity: neckShown }],
    ["neck-base", { d: head.neck.base, opacity: neckShown }],
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
    ...legs.flatMap(
      ({ drumstick, lit, shank, toes }, index) =>
        [
          [`drumstick-${index}`, { d: drumstick }],
          [`shank-${index}`, { d: shank }],
          [`toes-${index}`, { d: toes }],
          [`shank-lit-${index}`, { d: shank, opacity: lit }],
          [`toes-lit-${index}`, { d: toes, opacity: lit }],
        ] satisfies [string, Part][],
    ),
  ]) satisfies Record<string, Part>;

  const layers = layersOf(turkey, frame, { feathers, legs, torsoDepth, wings });
  const top = toScreen(head.at);
  const fanTop = toScreen(frame.place([TAIL[0], TAIL[1] + 36 * frame.fan, 0]));

  return {
    at: { x: turkey.walker.x, y: turkey.walker.y },
    bubble: { x: top.x, y: Math.min(top.y, fanTop.y) - 16 },
    order: layers,
    parts,
    say: turkey.emotes.line,
  } satisfies Pose;
};
