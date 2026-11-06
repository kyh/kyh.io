// How the penguin (`penguin.ts`) looks this frame, built in the round and
// seen from a little above (`../follower/solid.ts`): its body and head
// solids, its white front (the part of its body turned forward, as it
// shows), eyes and beak on its head (turned and
// nodded on their own), flippers hung from its shoulders and raised from its
// sides, feet on the ground stepping, a stub of a tail, and its scarf, the
// near side of a ring about its neck and an end hanging and swinging. The
// whole body rocks foot to foot as it waddles, bows, leans back, lies down on
// its belly to slide, and turns to its heading; each part is a layer stacked
// by how near the camera it is. In its own pixels: x forward, y up, z to its
// left, its feet at the origin. Pure.
import type { Point } from "../follower/chain";
import type { Part, Pose } from "../follower/creature";
import type { Ellipse, Mat3, Vec3 } from "../follower/solid";
import type { Penguin } from "./penguin";
import { round } from "../art";
import { chainPath } from "../follower/chain";
import {
  add,
  apply,
  capPath,
  compose,
  depthOf,
  ellipseOf,
  ellipsePath,
  facing,
  hullPath,
  linePath,
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
import { footAt, pace } from "../follower/walk";

const BODY: Vec3 = [0, 17, 0];
const BODY_RADII: Vec3 = [11, 17, 10.5];
/** Its white front: the cap of its body past a plane tipped forward and down (as for a unit sphere). */
const FRONT_NORMAL: Vec3 = [1, -0.35, 0];
const FRONT_OFFSET = 0.2;
const HEAD: Vec3 = [2.5, 34, 0];
const HEAD_R = 8;
/** What it rocks and bows about: low on its feet. */
const PIVOT: Vec3 = [0, 3, 0];
const SCARF: Vec3 = [1.4, 28.6, 0];
const SCARF_RADII = [10.6, 10.2] as const;
const SCARF_SAMPLES = 32;
/** Where the scarf's knot sits round its neck (radians from its front, toward its left), and its end's length. */
const KNOT = 0.8;
const SCARF_END = 12;

const axesOf = (radii: Vec3): Vec3[] => [
  [radii[0], 0, 0],
  [0, radii[1], 0],
  [0, 0, radii[2]],
];

/** Its frame this frame: how a point or a direction of its body is placed in the world. */
const frameOf = (penguin: Penguin) => {
  const { gait, rig, walker } = penguin;
  const slide = rig.slide.x;
  const walking = pace(walker, gait) * (1 - slide);
  const phase = walker.phase * Math.PI * 2;
  // Waddling, it rocks foot to foot, its body swinging a little with each step and riding up off it.
  const roll = Math.sin(phase) * 0.16 * walking;
  const wobble = Math.sin(phase) * 0.08 * walking;
  const bob = Math.abs(Math.sin(phase)) * 1.4 * walking;
  // Sliding, it lies forward on its belly.
  const body = compose(pitchOf(rig.pitch.x - 1.32 * slide), rollOf(roll));
  const yaw = yawOf(rig.heading.x + wobble);
  const lift = rig.lift.x + bob + 2.6 * slide;
  const turn = (direction: Vec3): Vec3 => apply(yaw, apply(body, direction));
  const place = (local: Vec3): Vec3 =>
    add(apply(yaw, add(apply(body, sub(local, PIVOT)), PIVOT)), [0, lift, 0]);
  return { hop: rig.lift.x, phase, place, slide, turn, walking, yaw };
};

type Frame = ReturnType<typeof frameOf>;

/** Its head: where it is, and its own turn and nod on top of the body's. */
const headOf = (penguin: Penguin, { place, turn }: Frame) => {
  const { rig } = penguin;
  const bowed = Math.max(0, -rig.nod.x);
  const center: Vec3 = [HEAD[0] + 2.4 * bowed, HEAD[1] - 2.6 * bowed - 3 * rig.doze.x, 0];
  const own: Mat3 = compose(yawOf(rig.look.x), pitchOf(rig.nod.x));
  const direction = (local: Vec3) => turn(apply(own, local));
  const at = place(center);
  const point = (local: Vec3) => add(at, direction(local));
  return { at, direction, point };
};

type Head = ReturnType<typeof headOf>;

/** Its eyes: a white ring and a dark eye on each side of its head, seen as it faces. */
const eyesOf = (penguin: Penguin, head: Head) => {
  const shut = penguin.rig.doze.x;
  return [1, -1].flatMap((side, index) => {
    const out = normalize([0.5, 0.26, 0.82 * side]);
    const normal = head.direction(out);
    const at = head.point(scale(out, HEAD_R - 0.2));
    const [u, v] = tangentsOf(normal);
    const shown = smooth((facing(normal) - 0.05) / 0.25);
    const ring = ellipseOf(at, [scale(u, 2.3), scale(v, 2.3)]);
    const eye = ellipseOf(add(at, scale(normal, 0.2)), [scale(u, 1.15), scale(v, 1.15)]);
    const lid = linePath([add(at, scale(u, 2.1)), add(at, scale(u, -2.1))]);
    return [
      [`ring-${index}`, { d: ellipsePath(ring), opacity: round(shown) }],
      [`eye-${index}`, { d: ellipsePath(eye), opacity: round(shown * (1 - shut)) }],
      [`lid-${index}`, { d: lid, opacity: round(shown * shut) }],
    ] as const;
  });
};

/** Its beak, its lower half opening as it brays: from any side, the outline round its points. */
const beakOf = (penguin: Penguin, head: Head) => {
  const base: Vec3 = [HEAD_R - 0.7, -0.8, 0];
  const tip: Vec3 = [HEAD_R + 6, -1.6, 0];
  const open = apply(pitchOf(-0.6 * penguin.rig.beak.x), sub(tip, base));
  const upper = [add(base, [0, 1.5, 0]), add(base, [0, 0, 1.4]), add(base, [0, 0, -1.4]), tip];
  const lower = [
    add(base, [0, -1.2, 0]),
    add(base, [0, -0.2, 1.2]),
    add(base, [0, -0.2, -1.2]),
    add(base, open),
  ];
  return {
    lower: hullPath(lower.map(head.point)),
    tipDepth: depthOf(head.point(tip)),
    upper: hullPath(upper.map(head.point)),
  };
};

/** A flipper (1 its left, -1 its right): a flattened solid hung from its shoulder, raised out from its side. */
const flipperOf = (penguin: Penguin, frame: Frame, side: 1 | -1, index: number) => {
  const raise = penguin.rig.flippers[index]?.x ?? 0;
  // Waddling, they swing a little forward and back, out of step with each other.
  const swing = Math.sin(frame.phase) * 0.25 * frame.walking * side;
  const rotation = compose(pitchOf(swing), rollOf(-side * raise));
  const length = scale(apply(rotation, normalize([-0.25, -1, 0])), 10.5);
  const width = scale(apply(rotation, normalize([1, -0.25, 0])), 3.4);
  const thickness = scale(apply(rotation, [0, 0, 1]), 1.1);
  const shoulder: Vec3 = [1, 27, 10 * side];
  const center = frame.place(add(shoulder, scale(length, 0.92)));
  const outline = ellipseOf(center, [length, width, thickness].map(frame.turn));
  return { depth: depthOf(center), outline };
};

/** A foot on the ground (1 its left), stepping as it waddles; trailing behind as it slides. */
const footOf = (penguin: Penguin, frame: Frame, side: 1 | -1) => {
  const step = footAt(penguin.walker, penguin.gait, side === 1 ? 0 : 0.5, 2.6);
  const { hop, slide } = frame;
  // Jumping, its feet leave the ground with it.
  const local: Vec3 = [
    3 + step.x * (1 - slide) - 13 * slide,
    -step.y * (1 - slide) + slide + hop,
    4 * side,
  ];
  const at = apply(frame.yaw, local);
  return {
    depth: depthOf(at),
    outline: ellipseOf(at, [apply(frame.yaw, [4.2, 0, 0]), apply(frame.yaw, [0, 0, 2.3])]),
  };
};

/** The near side of its scarf, round its neck: the part of the ring facing the camera. */
const scarfOf = (frame: Frame) => {
  const points = Array.from({ length: SCARF_SAMPLES }, (_, index) => {
    const t = (index / SCARF_SAMPLES) * Math.PI * 2;
    const local: Vec3 = [
      SCARF[0] + Math.cos(t) * SCARF_RADII[0],
      SCARF[1],
      Math.sin(t) * SCARF_RADII[1],
    ];
    return {
      at: frame.place(local),
      shown: facing(frame.turn([Math.cos(t), 0, Math.sin(t)])) > 0.02,
    };
  });
  // From the first hidden point round, the longest run that shows.
  const start = Math.max(
    0,
    points.findIndex((point) => !point.shown),
  );
  const runs: Vec3[][] = [[]];
  for (let step = 0; step <= SCARF_SAMPLES; step += 1) {
    const point = points[(start + step) % SCARF_SAMPLES];
    if (point?.shown) {
      runs.at(-1)?.push(point.at);
    } else if ((runs.at(-1)?.length ?? 0) > 0) {
      runs.push([]);
    }
  }
  const longest = runs.toSorted((a, b) => b.length - a.length)[0] ?? [];
  return longest.length > 1 ? linePath(longest) : "";
};

/** Its scarf's end, hanging from the knot and swinging as it's carried. */
/** Where the scarf's knot is, on its body. */
const SCARF_KNOT: Vec3 = [
  SCARF[0] + Math.cos(KNOT) * SCARF_RADII[0],
  SCARF[1] - 1,
  Math.sin(KNOT) * SCARF_RADII[1],
];
/** How many links its end has. */
const SCARF_LINKS = 4;

/**
 * Where its scarf's end would hang at rest this frame, knot first, on the
 * screen about where it stands: the chain (`penguin.ts`) is pulled toward it,
 * and the air and its swing do the rest.
 */
export const scarfRestOf = (penguin: Penguin): Point[] => {
  const frame = frameOf(penguin);
  const hang = normalize(apply(pitchOf(-0.15), [0.1, -1, 0.3]));
  return Array.from({ length: SCARF_LINKS + 1 }, (_, index) =>
    toScreen(frame.place(add(SCARF_KNOT, scale(hang, (SCARF_END * index) / SCARF_LINKS)))),
  );
};

const scarfEndOf = (penguin: Penguin, frame: Frame) => ({
  d: chainPath(penguin.scarfEnd, penguin.walker),
  depth: depthOf(frame.place(add(SCARF_KNOT, [0, -SCARF_END / 2, 0]))),
});

const solid = (name: string, outline: Ellipse): [string, Part][] => {
  const { lit, whole } = solidPaths(outline);
  return [
    [name, { d: whole }],
    [`${name}-lit`, { d: lit }],
  ];
};

export const penguinPose = (penguin: Penguin): Pose => {
  const frame = frameOf(penguin);
  const head = headOf(penguin, frame);
  const torso = frame.place(BODY);
  const torsoDepth = depthOf(torso);
  const bodyOutline = ellipseOf(torso, axesOf(BODY_RADII).map(frame.turn));
  const beak = beakOf(penguin, head);
  const flippers = ([1, -1] as const).map((side, index) => flipperOf(penguin, frame, side, index));
  const feet = ([1, -1] as const).map((side) => footOf(penguin, frame, side));
  const tail = frame.place([-10.5, 4.5, 0]);
  const scarfEnd = scarfEndOf(penguin, frame);
  const tailAxes = [apply(pitchOf(-0.6), [4.5, 0, 0]), [0, 1.2, 0], [0, 0, 2.8]] satisfies Vec3[];

  const parts = Object.fromEntries([
    ...solid("body", bodyOutline),
    // The white front, shaded where the body is.
    [
      "front",
      {
        d: capPath(
          { center: torso, radii: BODY_RADII, turn: frame.turn },
          FRONT_NORMAL,
          FRONT_OFFSET,
        ),
      },
    ],
    ["front-lit", { d: solidPaths(bodyOutline).lit }],
    ...solid("head", ellipseOf(head.at, axesOf([HEAD_R, HEAD_R, HEAD_R]))),
    ...eyesOf(penguin, head),
    ["beak-upper", { d: beak.upper }],
    ["beak-lower", { d: beak.lower }],
    ...flippers.flatMap(({ outline }, index) => solid(`flipper-${index}`, outline)),
    ...feet.map(({ outline }, index) => [`foot-${index}`, { d: ellipsePath(outline) }] as const),
    ["tail", { d: ellipsePath(ellipseOf(tail, tailAxes.map(frame.turn))) }],
    ["scarf", { d: scarfOf(frame) }],
    ["scarf-end", { d: scarfEnd.d }],
  ]) satisfies Record<string, Part>;

  // Back to front: what's nearer the camera is drawn over. The beak goes before the head once it's turned away.
  const layers: [string, number][] = [
    ["torso", torsoDepth],
    ["beak", torsoDepth + (beak.tipDepth - depthOf(head.at)) * 3],
    ["tail", depthOf(tail)],
    ["scarf-end", scarfEnd.depth],
    ...flippers.map(({ depth }, index): [string, number] => [`flipper-${index}`, depth - 1.5]),
    ...feet.map(({ depth }, index): [string, number] => [`foot-${index}`, depth]),
  ];
  const top = toScreen(head.at);
  return {
    at: { x: penguin.walker.x, y: penguin.walker.y },
    bubble: { x: top.x, y: top.y - HEAD_R - 12 },
    order: layers.toSorted((a, b) => a[1] - b[1]).map(([name]) => name),
    parts,
    say: penguin.emotes.line,
  };
};
