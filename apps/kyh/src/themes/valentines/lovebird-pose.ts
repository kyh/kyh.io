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
  curveOf,
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
export const SIZE = 1.5;
const BODY: Vec3 = [0, 10.5, 0];
const PERCHED_RADII: Vec3 = [10.5, 8.2, 8];
const FLYING_RADII: Vec3 = [12, 7.2, 7.2];
const PERCHED_NECK: Vec3 = [9.2, 2.6, 0];
const FLYING_NECK: Vec3 = [11, 2.2, 0];
const HEAD_R = 7;
const PREEN_NECK: Vec3 = [5, 3.5, 5];
const RUMP_NORMAL: Vec3 = [-0.8, 0.6, 0];
const RUMP_OFFSET = 0.84;
const FACE_NORMAL: Vec3 = [1, -0.55, 0];
const FACE_OFFSET = 0;
const BROW_NORMAL: Vec3 = [0.95, 0.32, 0];
const BROW_OFFSET = 0.8;
const SHOULDER: Vec3 = [4, 5, 5.2];
const HIP: Vec3 = [0.8, -6.6, 2.4];
const TAIL_ROOT: Vec3 = [-9, -0.5, 0];
const TAIL_LENGTH = 12.5;
const FEATHERS = 7;
const TAIL_LINKS = 3;
const WRIST = 1;
const TIP = 2;

const FOLDED: readonly Vec3[] = [
  [5.5, 5.2, 5.8],
  [6.5, 0.6, 7],
  [-16, 1.5, 2.2],
  [-12, 4.2, 3.4],
  [-6, 5.8, 5],
  [-1, 6.4, 5.4],
  [2.5, 6.6, 5],
];

const SPREAD: readonly Vec3[] = [
  [1.2, 0, 0],
  [2.5, 0.4, 8.5],
  [-4.5, 0, 23],
  [-9.5, 0, 18.5],
  [-9.5, 0, 11],
  [-8.5, 0, 5],
  [-7, 0, 0],
];

const HAND_SHARE = [0, 0, 1, 1, 0.5, 0, 0] as const;
const LENS = 1.55;

const PREENED: readonly Vec3[] = [
  [0.5, 1, 0.8],
  [2, 4.5, 2.5],
  [1, 4, 3],
  [0.5, 3.5, 2.5],
  [0.5, 3, 2],
  [0.5, 2, 1.2],
  [0.5, 0.8, 0.5],
];

const side3 = ([x, y, z]: Vec3, side: number) => [x, y, z * side] satisfies Vec3;
const at = (points: readonly Vec3[], index: number) => (points[index] ?? [0, 0, 0]) satisfies Vec3;

const buildFrame = (bird: Lovebird) => {
  const { rig, wings } = bird;
  const tilt = pitchOf(-(bird.sway.x + bird.shiver + rig.spin.x));
  const yaw = yawOf(rig.heading.x);
  const body = compose(pitchOf(rig.pitch.x), rollOf(rig.bank.x));
  const orient = compose(tilt, compose(yaw, body));
  const heave = -0.9 * (wings.arm - HELD) * rig.spread.x * rig.amp.x * (1 - bird.perch);
  const steady = add(apply(tilt, BODY), [0, rig.lift.x - bird.dip.x, 0]);
  const center = add(steady, [0, heave, 0]);
  const turn = (direction: Vec3) => apply(orient, direction);

  const unturn = (direction: Vec3) =>
    [
      orient[0][0] * direction[0] + orient[1][0] * direction[1] + orient[2][0] * direction[2],
      orient[0][1] * direction[0] + orient[1][1] * direction[1] + orient[2][1] * direction[2],
      orient[0][2] * direction[0] + orient[1][2] * direction[1] + orient[2][2] * direction[2],
    ] satisfies Vec3;

  const place = (local: Vec3) => add(center, turn(local));
  const placeSteady = (local: Vec3) => add(steady, turn(local));
  const puff = 1 + 0.08 * rig.fluff.x;
  const radii = scale(mix(FLYING_RADII, PERCHED_RADII, bird.perch), puff);

  return { center, place, placeSteady, radii, steady, tilt, turn, unturn, yaw };
};

type Frame = ReturnType<typeof buildFrame>;

const frames = new WeakMap<Lovebird, { frame: Frame; steps: number }>();

const frameOf = (bird: Lovebird) => {
  const kept = frames.get(bird);

  if (kept?.steps === bird.steps) {
    return kept.frame;
  }

  const frame = buildFrame(bird);
  frames.set(bird, { frame, steps: bird.steps });

  return frame;
};

const solid = (name: string, outline: Ellipse) => {
  const { lit, whole } = solidPaths(outline);

  return [
    [name, { d: whole }],
    [`${name}-lit`, { d: lit }],
  ] satisfies [string, Part][];
};

const rimAt = ({ angle, cx, cy, rx, ry }: Ellipse, t: number, out: number) => {
  const turn = (angle * Math.PI) / 180;
  const along = rx * Math.cos(t) * out;
  const across = ry * Math.sin(t) * out;

  return {
    x: cx + along * Math.cos(turn) - across * Math.sin(turn),
    y: cy + along * Math.sin(turn) + across * Math.cos(turn),
  } satisfies Point;
};

const pointPath = (points: readonly Point[]) =>
  `${points.map((p, index) => `${index === 0 ? "M" : "L"}${round(p.x)} ${round(p.y)}`).join("")}Z`;

const tuftsOf = (outline: Ellipse, ruffle: number, count: number, turn: number) => {
  const r = Math.min(outline.rx, outline.ry);
  const out = 1 + (2.4 * Math.max(0, ruffle)) / Math.max(r, 1);

  const top = (t: number) =>
    rimAt(outline, t, 1).y < outline.cy - 0.3 * Math.min(outline.rx, outline.ry);

  return Array.from({ length: count }, (_, index) => turn + (index / count) * Math.PI * 2)
    .filter(top)
    .map((t) =>
      pointPath([
        rimAt(outline, t - 0.26, 0.92),
        rimAt(outline, t - 0.06, (out + 1) / 2),
        rimAt(outline, t + 0.06, out),
        rimAt(outline, t + 0.26, 0.92),
      ]),
    )
    .join("");
};

const mid = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

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

const ruffleOf = (bird: Lovebird) => bird.rig.fluff.x - 0.4 * bird.rig.content.x - 0.1;

const bodyOf = (bird: Lovebird, frame: Frame) => {
  const body = { center: frame.center, radii: frame.radii, turn: frame.turn };
  const outline = ellipseOf(frame.center, axesOf(body));

  return {
    depth: depthOf(frame.center),
    outline,
    rump: capPath(body, RUMP_NORMAL, RUMP_OFFSET),
    tufts: tuftsOf(outline, ruffleOf(bird), 10, 0.3),
  };
};

const headOf = (bird: Lovebird, frame: Frame) => {
  const { rig } = bird;
  const [hx, hy, hz] = rig.head;
  const perched = mix(FLYING_NECK, PERCHED_NECK, bird.perch);
  const preening = mix(perched, side3(PREEN_NECK, bird.view.near), rig.preen.x);
  const neck = add(preening, [-1.5 * rig.doze.x, -3.2 * rig.doze.x, 0]);

  const center = add(
    add(frame.steady, apply(frame.tilt, apply(frame.yaw, apply(pitchOf(rig.pitch.x), neck)))),
    [hx.x, hy.x, hz.x],
  );

  const own: Mat3 = compose(
    yawOf(rig.heading.x + rig.look.x + 2.5 * bird.shiver),
    compose(pitchOf(rig.nod.x), rollOf(rig.cock.x)),
  );

  const direction = (local: Vec3) => apply(own, local);
  const point = (local: Vec3) => add(center, direction(local));
  const r = HEAD_R * (1 + 0.05 * rig.fluff.x - 0.06 * (1 - bird.perch));
  const sphere = { center, radii: [r, r, r] as const, turn: direction };

  return { center, direction, point, r, sphere };
};

type Head = ReturnType<typeof headOf>;

const eyesOf = (bird: Lovebird, head: Head) => {
  const { content, doze } = bird.rig;
  const shut = smooth(Math.max(doze.x, content.x, bird.blink) * 2 - 0.5);
  const arch = 1.4 * content.x - 0.4 * Math.max(doze.x, bird.blink);

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
      [`ring-${index}`, { d: disc(2.05), opacity: round(shown * (1 - shut)) }],
      [`eye-${index}`, { d: disc(1.2, scale(normal, 0.15)), opacity: round(shown * (1 - shut)) }],
      [
        `glint-${index}`,
        { d: disc(0.38, add(glint, scale(normal, 0.3))), opacity: round(shown * (1 - shut)) },
      ],
      [
        `lid-${index}`,
        {
          d: linePath(
            curveOf(
              add(center, scale(u, 1.7)),
              add(center, scale(head.direction([0, 1, 0]), arch)),
              add(center, scale(u, -1.7)),
              4,
            ),
          ),
          opacity: round(shown * shut),
        },
      ],
    ] as const;
  });
};

const BEAK_TIP: Vec3 = [10.4, -1.4, 0];

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
    front: bird.view.beakFront,
    lower: hullPath(lower.map(head.point)),
    upper: hullPath(upper.map(head.point)),
  };
};

const turnAbout = (v: Vec3, axis: Vec3, angle: number) => {
  const c = Math.cos(angle);

  return add(
    add(scale(v, c), scale(cross(axis, v), Math.sin(angle))),
    scale(axis, dot(axis, v) * (1 - c)),
  );
};

const topOf = (points: readonly Vec3[], side: number) =>
  normalize(
    scale(cross(sub(at(points, TIP), at(points, 0)), sub(at(points, 0), at(points, 6))), side),
  );

const cupped = (
  points: Vec3[],
  shoulder: Vec3,
  side: number,
  toCamera: Vec3,
  amount: number,
  face: number,
) => {
  const span = normalize(sub(at(points, TIP), shoulder));
  const across = sub(toCamera, scale(span, dot(toCamera, span)));
  const reach = amount * smooth((Math.hypot(...across) - 0.1) / 0.2);

  if (reach <= 0) {
    return points;
  }

  const normal = topOf(points, side);
  const goal = scale(normalize(across), face);
  const angle = Math.atan2(dot(cross(normal, goal), span), dot(normal, goal));

  const by =
    Math.max(-1.4, Math.min(1.4, angle * reach)) * smooth((Math.PI - Math.abs(angle)) / 0.3);

  return points.map((point) => add(shoulder, turnAbout(sub(point, shoulder), span, by)));
};

const wingPosed = (bird: Lovebird, side: 1 | -1) => {
  const { rig, wings } = bird;
  const preening = side === bird.view.near ? rig.preen.x : 0;
  const spread = rig.spread.x * (1 - 0.35 * rig.amp.x * upstrokeAt(wings.phase));
  const wrist = side3(at(SPREAD, WRIST), side);

  const raise = compose(
    rollOf(-side * (wings.arm + 0.25 * rig.flare.x)),
    yawOf(-side * 0.45 * rig.flare.x),
  );

  const bend = rollOf(-side * (wings.hand.x - wings.arm));
  const twist = pitchOf(0.45 * rig.amp.x * upstrokeAt(wings.phase));
  const shoulder = side3(SHOULDER, side);

  const open = SPREAD.map((point, index) => {
    const out = side3(point, side);
    const share = HAND_SHARE[index] ?? 0;
    const bent = add(wrist, apply(bend, sub(out, wrist)));

    return add(shoulder, apply(raise, apply(twist, mix(out, bent, share))));
  });

  const tucked = FOLDED.map((folded, index) =>
    add(side3(folded, side), scale(side3(at(PREENED, index), side), preening)),
  );

  const braced = Math.min(1, Math.max(0, Math.max(2 * rig.flare.x, rig.legs.x) - 0.02));
  const cup = 0.9 * braced * Math.min(1, Math.max(0, spread - 0.02) * 3);

  return { cup, open, shoulder, spread, tucked };
};

const between = (tucked: readonly Vec3[], open: readonly Vec3[], spread: number) =>
  tucked.map((point, index) => mix(point, at(open, index), spread));

const faceIndex = (side: 1 | -1) => (side === 1 ? 0 : 1);

const wingPoints = (bird: Lovebird, frame: Frame, side: 1 | -1) => {
  const { cup, open, shoulder, spread, tucked } = wingPosed(bird, side);
  const face = bird.wings.faces[faceIndex(side)];
  const toCamera = frame.unturn(TOWARD_CAMERA);

  return between(tucked, cupped(open, shoulder, side, toCamera, cup, face), spread).map(
    frame.place,
  );
};

const faceOf = (bird: Lovebird, frame: Frame, side: 1 | -1) => {
  const { cup, open, spread, tucked } = wingPosed(bird, side);

  if (cup > 0) {
    return bird.wings.faces[faceIndex(side)];
  }

  const nearer = dot(topOf(between(tucked, open, spread), side), frame.unturn(TOWARD_CAMERA));

  return spread < 0.5 || nearer >= 0 ? 1 : -1;
};

/** The faces its wings are cupped to, after this frame. */
export const settleFaces = (bird: Lovebird) => {
  const frame = frameOf(bird);

  return [faceOf(bird, frame, 1), faceOf(bird, frame, -1)] satisfies [1 | -1, 1 | -1];
};

const lensOf = (outline: readonly Point[], out: Point, thick: number) => {
  const seen = Math.hypot(out.x, out.y);

  if (seen < 0.001) {
    return outline;
  }

  const up = { x: out.x / seen, y: out.y / seen };

  const placed = outline.map((point) => ({
    along: point.y * up.x - point.x * up.y,
    height: point.x * up.x + point.y * up.y,
    point,
  }));

  const alongs = placed.map(({ along }) => along);
  const start = Math.min(...alongs);
  const end = Math.max(...alongs);
  const from = alongs.indexOf(start);
  const to = alongs.indexOf(end);

  const onFirst = (index: number) =>
    from <= to ? index >= from && index <= to : index >= from || index <= to;

  const heightOf = (first: boolean) => {
    const side = placed.filter((_, index) => onFirst(index) === first);

    return side.reduce((sum, { height }) => sum + height, 0) / Math.max(1, side.length);
  };

  const way = heightOf(true) >= heightOf(false) ? 1 : -1;

  return placed.map(({ along, point }, index) => {
    const t = (2 * along - start - end) / Math.max(end - start, 1);
    const by = thick * seen * (1 - t ** 4) * (onFirst(index) ? way : -way);

    return { x: point.x + up.x * by, y: point.y + up.y * by };
  });
};

const quill = (from: Vec3, to: Vec3) => [mix(from, to, 0.1), mix(from, to, 0.92)];

const wingOf = (bird: Lovebird, frame: Frame, side: 1 | -1) => {
  const points = wingPoints(bird, frame, side);
  const seen = points.map(toScreen);
  const p = (index: number) => at(points, index);
  const s = (index: number) => seen[index] ?? { x: 0, y: 0 };
  const unit = topOf(points, side);
  const top = smooth(dot(unit, TOWARD_CAMERA) / 0.16 + 0.5);

  const edge = lensOf(
    [s(0), s(WRIST), toScreen(mix(p(WRIST), p(TIP), 0.45)), s(TIP), s(3), s(4), s(5), s(6)],
    toScreen(unit),
    LENS * (0.7 + 0.3 * bird.rig.spread.x),
  );

  const along = (a: number, b: number, t: number) => mix(p(a), p(b), t);

  const quills = linesPath([
    quill(along(TIP, 3, 0.5), along(WRIST, TIP, 0.62)),
    quill(p(3), along(WRIST, TIP, 0.4)),
    quill(along(3, 4, 0.5), along(WRIST, TIP, 0.2)),
    quill(along(4, 5, 0.5), along(0, WRIST, 0.55)),
  ]);

  return {
    hand: loopPath([s(WRIST), s(TIP), s(3), s(4)], new Set([1])),
    outline: loopPath(edge, new Set([3])),
    quills,
    top,
  };
};

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
export const tailHangOf = (bird: Lovebird) => {
  const { spine } = tailFrameOf(bird, frameOf(bird));

  return hangOf(spine.map(toScreen), { x: bird.x, y: bird.y }, SIZE);
};

const swingOf = (bird: Lovebird, spine: readonly Vec3[]) => {
  const knots = chainAbout(bird.tail, { x: bird.x, y: bird.y }, SIZE);

  if (knots.length !== spine.length) {
    return spine.map(() => ({ x: 0, y: 0 }));
  }

  return spine.map((rest, index) => {
    const seen = toScreen(rest);
    const knot = knots[index] ?? seen;
    const most = (TAIL_LENGTH * 0.6 * index) / TAIL_LINKS;
    const off = Math.hypot(knot.x - seen.x, knot.y - seen.y);
    const keep = off > most ? most / off : 1;

    return { x: (knot.x - seen.x) * keep, y: (knot.y - seen.y) * keep };
  });
};

const swingAt = (swing: readonly Point[], t: number) => {
  const along = Math.max(0, Math.min(1, t)) * (swing.length - 1);
  const index = Math.min(swing.length - 2, Math.floor(along));
  const a = swing[index] ?? { x: 0, y: 0 };
  const b = swing[index + 1] ?? a;
  const k = along - index;

  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k } satisfies Point;
};

const linesPathFlat = (lines: readonly (readonly Point[])[]) =>
  lines
    .map((line) =>
      line.map((p, index) => `${index === 0 ? "M" : "L"}${round(p.x)} ${round(p.y)}`).join(""),
    )
    .join("");

const tailOf = (bird: Lovebird, frame: Frame) => {
  const { cock, root, spine } = tailFrameOf(bird, frame);
  const swing = swingOf(bird, spine);
  const fan = bird.rig.fan.x;
  const spread = 0.3 + 1.7 * fan;
  const across = frame.turn(apply(cock, [0, 0, 1]));

  const fanAt = (u: number, t: number) => {
    const angle = u * spread;
    const direction = frame.turn(apply(cock, [-Math.cos(angle), 0, Math.sin(angle)]));
    const length = TAIL_LENGTH * (1 - 0.34 * Math.min(1, Math.abs(u) * 2) ** 2);
    const under = frame.turn(apply(cock, [0, -4.5 * Math.abs(u) * t, 0]));

    const seen = toScreen(
      add(add(add(root, scale(across, u * 2.6)), scale(direction, length * t)), under),
    );

    const carried = swingAt(swing, (t * length) / TAIL_LENGTH);

    return { x: seen.x + carried.x, y: seen.y + carried.y } satisfies Point;
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

  const band = (from: number, to: number) =>
    loopPath(
      [fanAt(from, 0.32), fanAt(from, 0.64), fanAt(to, 0.62), fanAt(to, 0.34)],
      new Set([0, 1, 2, 3]),
    );

  return {
    band: band(-edge * 0.96, -0.28) + band(edge * 0.96, 0.28),
    banded: smooth((fan - 0.25) / 0.4),
    outline: loopPath(outline, new Set([0, outline.length - 1])),
    quills,
  };
};

const legOf = (bird: Lovebird, frame: Frame, side: 1 | -1) => {
  const { rig } = bird;
  const hip = add(frame.steady, apply(frame.tilt, apply(frame.yaw, side3(HIP, side))));
  const tucked = add(hip, apply(frame.yaw, [-2, -0.6, 0]));
  const thrown = add(hip, apply(frame.yaw, [2.6, -5.2, 0.8 * side]));
  const grip = apply(frame.yaw, [0.6, 0, 2.1 * side]);
  const foot = mix(mix(tucked, thrown, rig.reach.x), grip, rig.legs.x);
  const open = 0.45 + 0.55 * Math.max(rig.legs.x, rig.reach.x);
  const curl = -0.9 * rig.legs.x;

  const toe = (x: number, z: number) => [
    foot,
    add(foot, apply(frame.yaw, [x * open, (curl - 0.3) * open, z * side])),
  ];

  return {
    path:
      linePath([hip, foot]) +
      linesPath([toe(2.4, 0.7), toe(2, -0.4), toe(-2, 0.7), toe(-1.6, -0.3)]),
  };
};

/** Which of its sides faces the camera, and so how its layers stack: held till a side's clearly turned, so nothing flickers in front and behind. */
export interface View {
  /** Seconds since it last changed: it's held at least a moment, so nothing flickers. */
  age: number;
  /** Its side toward the camera (1 its left): that wing and foot in front of its body, the others behind. */
  near: 1 | -1;
  /** Its head in front of its body (not turned away), and in front of its near wing too (turned toward the camera). */
  headFront: boolean;
  headOverWing: boolean;
  /** Its tail in front of its body: pointing toward the camera, flying away. */
  tailFront: boolean;
  /** Its beak drawn over its head: its tip nearer the camera than its head's middle. */
  beakFront: boolean;
  /** Its feet down (gripping or thrown forward to land), so its near one's in front of its body; tucked up, both behind. */
  feetDown: boolean;
}

/** How much its left side, its face and its tail face the camera this frame (-1 away to 1 toward), and how much nearer its beak's tip is than its head's middle (pixels). */
export const viewOf = (bird: Lovebird) => {
  const frame = frameOf(bird);
  const { cock } = tailFrameOf(bird, frame);
  const head = headOf(bird, frame);

  return {
    beak: depthOf(head.point(BEAK_TIP)) - depthOf(head.center),
    feet: Math.max(bird.rig.legs.x, bird.rig.reach.x),
    forward: dot(apply(frame.yaw, [1, 0, 0]), TOWARD_CAMERA),
    left: dot(frame.turn([0, 0, 1]), TOWARD_CAMERA),
    tail: dot(frame.turn(apply(cock, [-1, 0, 0])), TOWARD_CAMERA),
  };
};

const held = (was: boolean, value: number, low: number, high: number) =>
  value > high || (was && value >= low);

const turnView = (view: View, facings: ReturnType<typeof viewOf>) => {
  let { near } = view;

  if (facings.left > 0.12) {
    near = 1;
  } else if (facings.left < -0.12) {
    near = -1;
  }

  return {
    age: view.age,
    beakFront: held(view.beakFront, facings.beak, -1.2, 1.2),
    feetDown: held(view.feetDown, facings.feet, 0.3, 0.6),
    headFront: held(view.headFront, facings.forward, -0.4, -0.12),
    headOverWing: held(view.headOverWing, facings.forward, 0.2, 0.4),
    near,
    tailFront: held(view.tailFront, facings.tail, 0.05, 0.3),
  } satisfies View;
};

const VIEW_S = 0.15;

/** The view after this frame's facings, each choice changed only once it's clearly past its turn, and not again for a moment. */
export const settleView = (view: View, facings: ReturnType<typeof viewOf>, seconds: number) => {
  const next = turnView(view, facings);

  const changed =
    next.near !== view.near ||
    next.headFront !== view.headFront ||
    next.headOverWing !== view.headOverWing ||
    next.tailFront !== view.tailFront ||
    next.beakFront !== view.beakFront ||
    next.feetDown !== view.feetDown;

  if (!changed || view.age < VIEW_S) {
    return { ...view, age: view.age + seconds } satisfies View;
  }

  return { ...next, age: 0 } satisfies View;
};

const orderOf = (view: View) => {
  const { feetDown } = view;
  const [nearWing, farWing] = view.near === 1 ? ["wing-0", "wing-1"] : ["wing-1", "wing-0"];
  const [nearLeg, farLeg] = view.near === 1 ? ["leg-0", "leg-1"] : ["leg-1", "leg-0"];
  const order = feetDown ? [farWing, farLeg] : [farWing, farLeg, nearLeg];

  if (!view.tailFront) {
    order.push("tail");
  }

  if (!view.headFront) {
    order.push("head");
  }

  order.push("body");

  if (feetDown) {
    order.push(nearLeg);
  }

  if (view.tailFront) {
    order.push("tail");
  }

  if (!view.headFront) {
    order.push(nearWing);
  } else if (view.headOverWing) {
    order.push(nearWing, "head");
  } else {
    order.push("head", nearWing);
  }

  return order;
};

export const lovebirdPose = (bird: Lovebird) => {
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
    ["head-tufts", { d: tuftsOf(headOutline, ruffleOf(bird) * 0.8, 8, 1.1) }],
    ["face", { d: capPath(head.sphere, FACE_NORMAL, FACE_OFFSET) }],
    ["face-lit", { d: headLit }],
    ["brow", { d: capPath(head.sphere, BROW_NORMAL, BROW_OFFSET) }],
    ["brow-lit", { d: headLit }],
    ...eyesOf(bird, head),
    ["beak-upper-front", { d: beak.front ? beak.upper : "" }],
    ["beak-lower-front", { d: beak.front ? beak.lower : "" }],
    ["beak-upper-back", { d: beak.front ? "" : beak.upper }],
    ["beak-lower-back", { d: beak.front ? "" : beak.lower }],
    ...wings.flatMap(
      ({ hand, outline, quills, top }, index) =>
        [
          [`wing-${index}`, { d: outline }],
          [`wing-${index}-top`, { d: outline, opacity: round(top) }],
          [`hand-${index}`, { d: hand, opacity: round(top) }],
          [`quills-${index}`, { d: quills }],
        ] satisfies [string, Part][],
    ),
    ["tail", { d: tail.outline }],
    ["tail-quills", { d: tail.quills }],
    ["band", { d: tail.band, opacity: round(tail.banded) }],
    ...legs.map(({ path }, index) => [`leg-${index}`, { d: path }] as const),
  ]) satisfies Record<string, Part>;

  const crown = toScreen(head.center);

  return {
    at: { x: bird.x, y: bird.y },
    bubble: { x: crown.x, y: crown.y - head.r - 10 },
    order: orderOf(bird.view),
    parts,
    say: bird.emotes.line,
  } satisfies Pose;
};
