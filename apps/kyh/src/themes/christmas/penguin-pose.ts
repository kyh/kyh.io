// How the penguin (`penguin.ts`) looks this frame, built in the round and
// seen from a little above (`../follower/solid.ts`): its body and head
// solids, its white front (the part of its body turned forward, as it
// shows), eyes and beak on its head (turned and nodded on their own),
// flippers hung from its shoulders and raised from its sides, feet planted on
// the ground where they landed (`../follower/feet.ts`), a stub of a tail, and its
// scarf, the near side of a ring about its neck and two ends hanging from
// the knot. The whole body rocks foot to foot as it waddles, bows, leans
// back, squats and stretches as it jumps, and lies down on its belly to slide
// (about its middle, so it lies where it stood, its feet and tail trailing
// from its rear and its head held up to see where it's going); each part is
// a layer stacked in front of the body or behind it by which way it faces.
// In its own pixels: x forward, y up, z to its left, its feet at the origin.
// Pure.
import type { Point } from "../follower/chain";
import type { Part, Pose } from "../follower/creature";
import type { Ellipse, Mat3, Vec3 } from "../follower/solid";
import type { Penguin } from "./penguin";
import { SIZE } from "./penguin-go";
import { round } from "../art";
import { chainAbout } from "../follower/chain";
import { footIn } from "../follower/feet";
import {
  add,
  apply,
  capPath,
  compose,
  dot,
  depthOf,
  ellipseOf,
  ellipsePath,
  facing,
  hullPath,
  linePath,
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

const BODY: Vec3 = [0, 17, 0];
const BODY_RADII: Vec3 = [11, 17, 10.5];
/** Its white front: the cap of its body past a plane tipped forward and down (as for a unit sphere). */
const FRONT_NORMAL: Vec3 = [1, -0.35, 0];
const FRONT_OFFSET = 0.05;
const HEAD: Vec3 = [2.5, 35.5, 0];
const HEAD_R = 8;
/** What it rocks and bows about: low on its feet. */
const PIVOT: Vec3 = [0, 3, 0];
/** On its belly: how far it's tipped forward, how far its middle sinks to lie on the snow, and its head held up. */
const LIE = 1.42;
const SINK = 6.5;
const HEAD_UP = 1.15;
const SCARF: Vec3 = [1.4, 28.6, 0];
const SCARF_RADII = [9.6, 9.2] as const;
const SCARF_SAMPLES = 48;
/** Where the scarf's knot sits round its neck (radians from its front, toward its left). */
const KNOT = 0.8;
/** Its scarf's ends: how long, how many links, and which way each hangs from the knot (radians round it). */
const SCARF_ENDS = [
  { length: 18, links: 6, splay: 0.3 },
  { length: 12, links: 4, splay: -0.35 },
] as const;
/** Its flippers: half their length, width and thickness, hung from its shoulders. */
const FLIPPER: Vec3 = [7, 3, 1];
const SHOULDER: Vec3 = [1, 27, 10];
/** A foot: half its length and its width; and as much of its leg as shows. */
const FOOT = [4.4, 2.5] as const;
const LEG = 3;

const axesOf = (radii: Vec3): Vec3[] => [
  [radii[0], 0, 0],
  [0, radii[1], 0],
  [0, 0, radii[2]],
];

/** Squat (+) or stretched tall (-), keeping its bulk. */
const squatOf = (squash: number): Mat3 => [
  [1 + squash / 2, 0, 0],
  [0, 1 - squash, 0],
  [0, 0, 1 + squash / 2],
];

/**
 * Its frame this frame: how a point or a direction of its body is placed in
 * the world. Steady, without its rock, bob and squash: what its scarf's ends
 * are carried by, so they swing with its going and not its every step.
 */
const frameOf = (penguin: Penguin, steady = false) => {
  const { rig } = penguin;
  const slide = rig.slide.x;
  const phase = penguin.feet.phase * Math.PI * 2;
  // Waddling, it rocks onto the foot it stands on (the left from a tenth of a stride in), its body
  // turning a little with each step and riding up over it.
  const sway = steady ? 0 : rig.waddle.x * (1 - slide);
  const rock = Math.sin(phase - Math.PI * 0.1);
  const roll = rock * 0.15 * sway;
  const wobble = rock * 0.07 * sway;
  const bob = Math.abs(rock) * 1.2 * sway;
  const rocked = compose(
    pitchOf(rig.pitch.x),
    compose(rollOf(roll), squatOf(steady ? 0 : rig.squash.x)),
  );
  // Sliding, it lies forward on its belly, tipped about its middle.
  const lie = pitchOf(-LIE * slide);
  const body = compose(lie, rocked);
  const yaw = yawOf(rig.heading.x + rig.twist.x + wobble);
  const lift = rig.lift.x + bob;
  const lain: Vec3 = [BODY[0], BODY[1] - SINK * slide, BODY[2]];
  const turn = (direction: Vec3): Vec3 => apply(yaw, apply(body, direction));
  const place = (local: Vec3): Vec3 => {
    const swayed = add(apply(rocked, sub(local, PIVOT)), PIVOT);
    return add(apply(yaw, add(apply(lie, sub(swayed, BODY)), lain)), [0, lift, 0]);
  };
  return { hop: rig.lift.x, place, slide, turn };
};

type Frame = ReturnType<typeof frameOf>;

/** Its head: where it is, and its own turn and nod on top of the body's (held up as it slides). */
const headOf = (penguin: Penguin, { place, slide, turn }: Frame) => {
  const { rig } = penguin;
  const bowed = Math.max(0, -rig.nod.x);
  // Bowed, it bends forward and down, toward the side it's turned to.
  const center: Vec3 = [
    HEAD[0] + 2.4 * bowed - 3.5 * slide,
    HEAD[1] - 2.6 * bowed - 3 * rig.doze.x,
    3.5 * Math.sin(rig.look.x) * bowed,
  ];
  const own: Mat3 = compose(yawOf(rig.look.x), pitchOf(rig.nod.x + HEAD_UP * slide));
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
    // Lying, its eyes are seen from ahead of it as much as from its sides: they show sooner.
    const slide = penguin.rig.slide.x;
    const out = normalize([0.5 + 0.5 * slide, 0.26, 0.82 * side]);
    const normal = head.direction(out);
    const at = head.point(scale(out, HEAD_R - 0.2));
    const [u, v] = tangentsOf(normal);
    const shown = smooth((facing(normal) + 0.02 * slide - 0.03) / 0.3);
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

/** Its beak: short and stout, its lower half opening as it brays; from any side, the outline round its points. */
const beakOf = (penguin: Penguin, head: Head) => {
  const base: Vec3 = [HEAD_R - 1.2, -0.2, 0];
  const tip: Vec3 = [HEAD_R + 5.2, -1.1, 0];
  const open = apply(pitchOf(-0.8 * penguin.rig.beak.x), sub(tip, base));
  const upper = [
    add(base, [0, 1.9, 0]),
    add(base, [0, 0.2, 2.2]),
    add(base, [0, 0.2, -2.2]),
    add(tip, [0, 0.3, 0]),
  ];
  const lower = [
    add(base, [0, -1.5, 0]),
    add(base, [0, -0.1, 1.9]),
    add(base, [0, -0.1, -1.9]),
    add(base, scale(open, 0.92)),
  ];
  return { lower: hullPath(lower.map(head.point)), upper: hullPath(upper.map(head.point)) };
};

/** A flipper (1 its left, -1 its right): a flattened solid hung from its shoulder, raised out from its side. */
const flipperOf = (penguin: Penguin, frame: Frame, side: 1 | -1, index: number) => {
  const raise = penguin.rig.flippers[index]?.x ?? 0;
  // Waddling, they swing a little forward and back, out of step with each other.
  const swing =
    Math.sin(penguin.feet.phase * Math.PI * 2) *
    0.2 *
    penguin.rig.waddle.x *
    (1 - frame.slide) *
    side;
  // Raised high (spread to bray, stretched, held out sliding), they sweep back too, out past its back.
  const back = -0.55 * Math.max(0, raise - 0.3);
  const rotation = compose(pitchOf(swing + back), rollOf(-side * raise));
  const length = scale(apply(rotation, normalize([-0.25, -1, 0])), FLIPPER[0]);
  const width = scale(apply(rotation, normalize([1, -0.25, 0])), FLIPPER[1]);
  const thickness = scale(apply(rotation, [0, 0, 1]), FLIPPER[2]);
  const shoulder: Vec3 = [SHOULDER[0], SHOULDER[1], SHOULDER[2] * side];
  const center = frame.place(add(shoulder, scale(length, 0.9)));
  const outline = ellipseOf(center, [length, width, thickness].map(frame.turn));
  return { center, outline };
};

/**
 * A foot (0 its left) and its leg: planted on the ground where it landed,
 * and lifted as it steps; sliding, trailing on the snow behind its rear.
 */
const footOf = (penguin: Penguin, frame: Frame, index: number) => {
  const { walker } = penguin;
  const foot = penguin.feet.feet[index];
  const side = index === 0 ? 1 : -1;
  const planted = foot ? add(footIn(foot, walker, SIZE), [0, frame.hop, 0]) : ([0, 0, 0] as const);
  const rear = frame.place([-1.5, -2, side * 3.6]);
  const at = mix(planted, [rear[0], rear[1] * 0.45, rear[2]], frame.slide);
  const turned = yawOf(foot?.turn ?? penguin.rig.heading.x);
  const ahead = apply(turned, [FOOT[0], 0, 0]);
  // Its leg: a short dark stub up from its heel toward its body, the rest of it under its feathers.
  const heel = add(at, scale(ahead, -0.35));
  const up = sub(frame.place([0.5, 4.5, side * 3.6]), heel);
  const long = Math.hypot(up[0], up[1], up[2]);
  return {
    at,
    leg: linePath([heel, add(heel, scale(up, Math.min(1, LEG / (long || 1))))]),
    outline: ellipseOf(at, [ahead, apply(turned, [0, 0, FOOT[1]])]),
  };
};

/** One point of its scarf's ring: where it is, and how much it faces the camera (signed). */
const ringAt = (frame: Frame, t: number) => ({
  at: frame.place([
    SCARF[0] + Math.cos(t) * SCARF_RADII[0],
    SCARF[1],
    Math.sin(t) * SCARF_RADII[1],
  ]),
  near: frame
    .turn([Math.cos(t), 0, Math.sin(t)])
    .reduce((sum, value, axis) => sum + value * (TOWARD_CAMERA[axis] ?? 0), -0.02),
});

/** One side of its scarf's ring (1 the near, -1 the far): the run of it facing that way, its ends where it turns. */
const arcOf = (frame: Frame, way: 1 | -1) => {
  const ring = Array.from({ length: SCARF_SAMPLES }, (_, index) => {
    const point = ringAt(frame, (index / SCARF_SAMPLES) * Math.PI * 2);
    return { at: point.at, near: point.near * way };
  });
  const shown = ring.filter(({ near }) => near > 0).length;
  if (shown === 0) {
    return "";
  }
  if (shown === SCARF_SAMPLES) {
    return `${linePath(ring.map(({ at }) => at))}Z`;
  }
  const at = (index: number) => ring[(index + SCARF_SAMPLES) % SCARF_SAMPLES] ?? ring[0];
  // Where the ring comes round into view, and between the samples where it does, exactly.
  const entering = ring.findIndex(
    (point, index) => point.near <= 0 && (at(index + 1)?.near ?? 0) > 0,
  );
  const crossing = (index: number): Vec3 => {
    const a = at(index);
    const b = at(index + 1);
    if (!a || !b) {
      return [0, 0, 0];
    }
    return mix(a.at, b.at, a.near / (a.near - b.near));
  };
  const arc: Vec3[] = [crossing(entering)];
  let index = entering + 1;
  while ((at(index)?.near ?? 0) > 0 && arc.length <= SCARF_SAMPLES) {
    arc.push(at(index)?.at ?? arc[0] ?? [0, 0, 0]);
    index += 1;
  }
  arc.push(crossing(index - 1));
  return linePath(arc);
};

/** Where round its neck the scarf's knot is: at its front, and lying on its belly, at its side (not under it on the snow). */
const knotAngleOf = (slide: number) => KNOT + (Math.PI * 0.55 - KNOT) * slide;

/** Where the scarf's knot is, on its body. */
const knotOf = (slide: number): Vec3 => [
  SCARF[0] + Math.cos(knotAngleOf(slide)) * SCARF_RADII[0],
  SCARF[1] - 1,
  Math.sin(knotAngleOf(slide)) * SCARF_RADII[1],
];

/**
 * Where one of its scarf's ends (0 the long, 1 the short) would hang at rest
 * this frame, knot first, on the screen about where it stands: hanging down
 * from the knot, a little out from its chest. The chain (`penguin.ts`) is
 * pulled toward it, and the air and its swing do the rest; `floor` is the
 * snow under the knot, which the chain lies on.
 */
export const scarfHangOf = (penguin: Penguin, which = 0) => {
  const frame = frameOf(penguin, true);
  const end = SCARF_ENDS[which] ?? SCARF_ENDS[0];
  const knot = frame.place(knotOf(frame.slide));
  const angle = knotAngleOf(frame.slide) + end.splay;
  const out = frame.turn([Math.cos(angle), 0, Math.sin(angle)]);
  const hang = normalize([out[0] * 0.35, -1, out[2] * 0.35]);
  const rest: Point[] = Array.from({ length: end.links + 1 }, (_, index) =>
    toScreen(add(knot, scale(hang, (end.length * index) / end.links))),
  );
  return { floor: toScreen([knot[0], 0, knot[2]]).y + 1, rest };
};

/** Where its scarf's long end would hang at rest this frame (`scarfHangOf`). */
export const scarfRestOf = (penguin: Penguin): Point[] => scarfHangOf(penguin).rest;

const fixed = (n: number) => round(n);
const pathOf = (points: readonly Point[], closed = false) =>
  `${points.map((p, index) => `${index === 0 ? "M" : "L"}${fixed(p.x)} ${fixed(p.y)}`).join("")}${closed ? "Z" : ""}`;

/**
 * One of its scarf's ends, drawn: the chain about where it stands, its top
 * carried with the knot as it rocks (the chain swings from where the knot is
 * on average), a strip narrowing to its tip, and a fringe.
 */
const scarfEndOf = (penguin: Penguin, frame: Frame, which: number) => {
  const chain = which === 0 ? penguin.scarfEnd : penguin.scarfShort;
  const points = chainAbout(chain, penguin.walker, SIZE);
  const [root] = points;
  if (!root || points.length < 2) {
    return { fringe: "", line: "", strip: "" };
  }
  const knot = toScreen(frame.place(knotOf(frame.slide)));
  const last = points.length - 1;
  const drawn = points.map((p, index) => {
    const carried = (1 - index / last) ** 2;
    return { x: p.x + (knot.x - root.x) * carried, y: p.y + (knot.y - root.y) * carried };
  });
  const across = drawn.map((p, index) => {
    const a = drawn[Math.max(0, index - 1)] ?? p;
    const b = drawn[Math.min(last, index + 1)] ?? p;
    const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const half = 2.2 - 0.6 * (index / last);
    return { x: (-(b.y - a.y) / length) * half, y: ((b.x - a.x) / length) * half };
  });
  const left = drawn.map((p, index) => ({
    x: p.x + (across[index]?.x ?? 0),
    y: p.y + (across[index]?.y ?? 0),
  }));
  const right = drawn.map((p, index) => ({
    x: p.x - (across[index]?.x ?? 0),
    y: p.y - (across[index]?.y ?? 0),
  }));
  const tip = drawn[last] ?? root;
  const before = drawn[last - 1] ?? root;
  const reach = Math.hypot(tip.x - before.x, tip.y - before.y) || 1;
  const on = { x: ((tip.x - before.x) / reach) * 2.6, y: ((tip.y - before.y) / reach) * 2.6 };
  const side = across[last] ?? { x: 0, y: 0 };
  const fringe = [-0.75, -0.25, 0.25, 0.75]
    .map((k) => {
      const from = { x: tip.x + side.x * k, y: tip.y + side.y * k };
      return pathOf([
        from,
        { x: from.x + on.x + side.x * k * 0.3, y: from.y + on.y + side.y * k * 0.3 },
      ]);
    })
    .join("");
  return { fringe, line: pathOf(drawn), strip: pathOf([...left, ...right.toReversed()], true) };
};

const solid = (name: string, outline: Ellipse): [string, Part][] => {
  const { lit, whole } = solidPaths(outline);
  return [
    [name, { d: whole }],
    [`${name}-lit`, { d: lit }],
  ];
};

/** Its tail: low at its back; pressed to its rear as it lies on its belly. */
const tailOf = (slide: number) => mix([-8, 3.5, 0], [-1.5, -0.5, 0], slide);

/** Nearer the camera than this, a layer goes over one it was under. */
const OVER = 1.5;

/**
 * Layers in the order they were, each moved past its neighbour only once
 * it's clearly the nearer: so two about as near don't swap back and forth.
 */
const settle = (layers: readonly [string, number][], was: readonly string[]) => {
  const rank = (name: string) => {
    const at = was.indexOf(name);
    return at === -1 ? Number.POSITIVE_INFINITY : at;
  };
  const list = layers.toSorted((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]);
  for (const _ of list) {
    for (let index = 0; index + 1 < list.length; index += 1) {
      const a = list[index];
      const b = list[index + 1];
      if (a && b && a[1] - b[1] > OVER) {
        list[index] = b;
        list[index + 1] = a;
      }
    }
  }
  return list.map(([name]) => name);
};

/**
 * How much its head is drawn over its scarf (and its scarf's ends under
 * it): once its neck points at the camera (lying on its belly, sliding at
 * it), and as it bows its head forward and down over the scarf.
 */
const headOverOf = (penguin: Penguin, frame: Frame) => {
  const lying = smooth((dot(frame.turn([0, 1, 0]), TOWARD_CAMERA) - 0.55) / 0.25);
  return { lying, over: Math.max(lying, smooth((-penguin.rig.nod.x - 0.12) / 0.2)) };
};

/** How much a direction of its body faces the camera, across the ground. */
const across = (frame: Frame, direction: Vec3) => frame.turn(direction)[2];

/**
 * Which side of its body a foot (1 its left) is on, by which way the body
 * faces, not where the foot is (so none pops through as the body goes over
 * it): in front whenever its front or the foot's side turns at all toward
 * the camera, behind only facing away; lying, its feet trail from its rear.
 */
const footSideOf = (penguin: Penguin, side: number) => {
  const heading = penguin.rig.heading.x;
  const ahead = Math.sin(heading) * (1 - 2 * penguin.rig.slide.x);
  return (ahead + 0.6 * side * Math.cos(heading) + 0.25) / 0.15;
};

/**
 * Which side of its body each layer is on, scaled so past 1 it's surely in
 * front and past -1 surely behind (`penguin.ts` holds each in between, so
 * none flickers as it steps): its feet by which way it faces, a flipper, its
 * tail and its scarf's knot by which way their side of it faces, its beak by
 * which way its head does.
 */
export const layerSidesOf = (penguin: Penguin) => {
  const frame = frameOf(penguin);
  const head = headOf(penguin, frame);
  const knot = knotAngleOf(frame.slide);
  return {
    beak: head.direction([1, 0, 0])[2] / 0.15,
    "flipper-0": across(frame, [0.35, 0, 1]) / 0.25,
    "flipper-1": across(frame, [0.35, 0, -1]) / 0.25,
    "foot-0": footSideOf(penguin, 1),
    "foot-1": footSideOf(penguin, -1),
    // By which way its knot faces, leaning to the front: hanging from a knot that shows, they show.
    "scarf-end": (across(frame, [Math.cos(knot), 0, Math.sin(knot)]) + 0.35) / 0.2,
    tail: across(frame, [-1, -0.3, 0]) / 0.2,
  } satisfies Record<string, number>;
};

/**
 * Its layers back to front: its legs (from under its body, behind all
 * else), what's behind its body, the body, and what's in front of it, each
 * side in order of how near the camera, settled from the order they were in
 * (`penguin.ts` keeps it, with which side each is on).
 */
export const orderOf = (penguin: Penguin) => {
  const frame = frameOf(penguin);
  const head = headOf(penguin, frame);
  const layers: [string, number][] = [
    ["beak", depthOf(head.point([HEAD_R, 0, 0]))],
    ["tail", depthOf(frame.place(tailOf(frame.slide)))],
    ["scarf-end", depthOf(frame.place(knotOf(frame.slide)))],
    ...([1, -1] as const).map((side, index): [string, number] => [
      `flipper-${index}`,
      depthOf(flipperOf(penguin, frame, side, index).center),
    ]),
    ...[0, 1].map((index): [string, number] => [
      `foot-${index}`,
      depthOf(footOf(penguin, frame, index).at),
    ]),
  ];
  // Not stepped yet (none held either side), each goes the side it's on.
  const sides: Record<string, number> =
    Object.keys(penguin.front).length === 0 ? layerSidesOf(penguin) : {};
  const isFront = ([name]: [string, number]) => penguin.front[name] ?? (sides[name] ?? 0) > 0;
  return [
    "legs",
    ...settle(
      layers.filter((layer) => !isFront(layer)),
      penguin.stack,
    ),
    "torso",
    ...settle(layers.filter(isFront), penguin.stack),
  ];
};

export const penguinPose = (penguin: Penguin): Pose => {
  const frame = frameOf(penguin);
  const head = headOf(penguin, frame);
  const torso = frame.place(BODY);
  const bodyOutline = ellipseOf(torso, axesOf(BODY_RADII).map(frame.turn));
  const beak = beakOf(penguin, head);
  const flippers = ([1, -1] as const).map((side, index) => flipperOf(penguin, frame, side, index));
  const feet = [0, 1].map((index) => footOf(penguin, frame, index));
  const tail = frame.place(tailOf(frame.slide));
  const tailAxes = [apply(pitchOf(-0.7), [4.5, 0, 0]), [0, 1.2, 0], [0, 0, 2.6]] satisfies Vec3[];
  const ends = [0, 1].map((which) => scarfEndOf(penguin, frame, which));

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
    ...feet.flatMap(({ leg, outline }, index) => [
      ...solid(`foot-${index}`, outline),
      [`leg-${index}`, { d: leg }] as const,
    ]),
    ["head-over", { opacity: round(headOverOf(penguin, frame).over) }],
    // Its scarf's ends tuck away under its head as it lies facing the camera, and come out as it gets up.
    ["scarf-ends", { opacity: round(1 - headOverOf(penguin, frame).lying) }],
    ["tail", { d: ellipsePath(ellipseOf(tail, tailAxes.map(frame.turn))) }],
    ["scarf", { d: arcOf(frame, 1) }],
    ["scarf-back", { d: arcOf(frame, -1) }],
    ...ends.flatMap(({ fringe, line, strip }, which) => {
      const name = which === 0 ? "scarf-end" : "scarf-short";
      return [
        [name, { d: strip }],
        [`${name}-stripes`, { d: line }],
        [`${name}-fringe`, { d: fringe }],
      ] as const;
    }),
  ]) satisfies Record<string, Part>;

  const top = toScreen(head.at);
  return {
    at: { x: penguin.walker.x, y: penguin.walker.y },
    bubble: { x: top.x, y: top.y - HEAD_R - 12 },
    order: penguin.stack.length > 0 ? penguin.stack : orderOf(penguin),
    parts,
    say: penguin.emotes.line,
  };
};
