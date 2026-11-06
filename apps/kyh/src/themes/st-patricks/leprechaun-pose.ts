// How the leprechaun (`leprechaun.ts`) looks this frame, built in the round
// and seen from a little above (`../follower/solid.ts`): a pot-bellied green
// coat, its tails two cloth chains hung from the back of it, a black belt
// round it and a gold buckle and buttons down its front; legs in green
// breeches and white stockings, hip to knee to ankle, in black shoes buckled
// gold that roll heel to toe; arms in green sleeves, shoulder to elbow to
// hand; a round head with ears, red hair at the back, a red beard round his
// jaw down to a point that swings (its tip a chain), a nose, rosy cheeks,
// eyes and red brows; and a buckled green hat, on his head or doffed in his
// hand; and the gold coin in the air. His hips and shoulders twist against
// each other as he walks, his body leans and rolls on its springs, and his
// head turns and nods on its own. Each part is a layer stacked by how near
// the camera it is. In his own pixels: x forward, y up, z to his left, his
// feet at the origin. Pure.
import type { Part, Pose } from "../follower/creature";
import type { Ellipse, Mat3, Vec3 } from "../follower/solid";
import type { Point } from "../follower/walk";
import type { Leprechaun } from "./leprechaun";
import { point, round } from "../art";
import { chainAbout } from "../follower/chain";
import { footIn } from "../follower/feet";
import {
  add,
  apply,
  axesOf,
  capPath,
  compose,
  cross,
  depthOf,
  dot,
  ellipseOf,
  ellipsePath,
  facing,
  hullPath,
  linePath,
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
  TOWARD_CAMERA,
  toScreen,
  yawOf,
} from "../follower/solid";
import { limbOf } from "../follower/walk";
import {
  coinOf,
  doffOf,
  aheadOf,
  gaitOf,
  HOP,
  elbowPole,
  HEAD,
  HEAD_R,
  liftOf,
  SHOULDER,
  sideOf,
  stampOf,
  STEPS,
} from "./leprechaun-acts";

const COAT: Vec3 = [0.4, 19.6, 0];
const COAT_RADII: Vec3 = [6.8, 9.2, 8];
const BELT_Y = 16.8;
const HIP: Vec3 = [0, 12.4, 2.6];
const LEG = [5.6, 5.6] as const;
const ARM = [6.6, 6.4] as const;
const ANKLE = 1.9;
/** The coat's tails, hung from the small of his back, root to tip (z flipped for his right). */
const TAIL: readonly Vec3[] = [
  [-4.4, 16.6, 1.9],
  [-6.8, 13.8, 2.4],
  [-7.4, 10.9, 2.8],
  [-7.5, 8, 3.1],
];
/** His beard's point, chin to tip, about his head. */
const BEARD: readonly Vec3[] = [
  [3.4, -6.4, 0],
  [4.2, -9.6, 0],
  [3.4, -12.8, 0],
];
const BRIM: readonly [number, number] = [7.8, 6.8];
/** His hair: the cap of his head behind and above a plane tipped up at the back (his nape bare). */
const HAIR_NORMAL: Vec3 = [-0.7, 1, 0];
const HAIR_OFFSET = 0.4;
/** His beard: the cap of a shell about his jaw below a plane tipped down at the front. */
const BEARD_NORMAL: Vec3 = [0.25, -1, 0];
const BEARD_OFFSET = 0.4;
const CROWN = { bottom: 4.9, high: 9, top: 4.3 } as const;
/** His shoe about the sole under his ankle: its sole round, then its upper. */
const SHOE: readonly Vec3[] = [
  [-1.7, 0, 1.1],
  [-1.7, 0, -1.1],
  [0.6, 0, 1.45],
  [0.6, 0, -1.45],
  [2.9, 0, 1],
  [2.9, 0, -1],
  [4.1, 0.2, 0],
  [-1.6, 1.7, 1],
  [-1.6, 1.7, -1],
  [0.3, 2.1, 1.1],
  [0.3, 2.1, -1.1],
  [2.3, 1.3, 0.9],
  [2.3, 1.3, -0.9],
  [3.7, 0.8, 0],
];
const HEEL: Vec3 = [-1.7, 0, 0];
const TOE: Vec3 = [3.9, 0, 0];
const RING_SAMPLES = 28;
/** A ball's three axes, unit long: a nose, a hand. */
const BALL: readonly Vec3[] = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

const COS = Math.cos(PITCH);
/** Turned this far from the camera (his face's facing, level), his face is gone, and goes under his coat. */
const FACE_AWAY = -0.42;

/** A point of the stage lifted back into the world on the camera's own plane: a chain's knot, for a hull. */
const lifted = (at: Point): Vec3 => [at.x, -at.y / COS, 0];

/**
 * How much a surface facing `normal` shows: eased in as it comes round to the
 * camera, from `from` (below 0, a part that stands out from it, as a nose, is
 * seen a little past the edge), and never at all from the far side.
 */
const shownOf = (normal: Vec3, from = 0.05) =>
  smooth((dot(normalize(normal), TOWARD_CAMERA) - from) / 0.25);

/** A two-boned limb in the round: its joint bent toward `pole`, worked out in the plane they make. */
const jointOf = (from: Vec3, to: Vec3, [upper, lower]: readonly [number, number], pole: Vec3) => {
  const span = sub(to, from);
  const along = normalize(span);
  const across = normalize(sub(pole, scale(along, dot(pole, along))));
  const reach = Math.hypot(span[0], span[1], span[2]);
  const { end, joint } = limbOf({ x: 0, y: 0 }, { x: reach, y: 0 }, upper, lower, -1);
  return {
    end: add(from, scale(along, end.x)),
    joint: add(from, add(scale(along, joint.x), scale(across, joint.y))),
  };
};

/**
 * The heel-and-toe roll of a foot through its stride, `duty` of it down: toe
 * up to strike, flat, heel up to push off, swung through toe up again.
 */
const rollOfFoot = (t: number, duty: number) => {
  if (t < duty * 0.18) {
    return 0.32 * (1 - smooth(t / (duty * 0.18)));
  }
  if (t < duty * 0.62) {
    return 0;
  }
  if (t < duty) {
    return -0.55 * smooth((t - duty * 0.62) / (duty * 0.38));
  }
  return -0.55 + 0.87 * smooth((t - duty) / (1 - duty));
};

/** His frame this frame: his feet's turn, his hips' and his body's, and where they put a point. */
const frameOf = (leprechaun: Leprechaun) => {
  const { rig } = leprechaun;
  const jig = rig.jig.x;
  const gait = gaitOf(leprechaun);
  const phase = leprechaun.feet.phase * Math.PI * 2;
  const lift = liftOf(leprechaun);
  // His hips turn with his forward foot, his shoulders against them; he rolls over the foot that's down.
  const ahead = aheadOf(leprechaun, 0) - aheadOf(leprechaun, 1);
  const twist = Math.max(-0.28, Math.min(0.28, -0.03 * ahead * (1 - jig)));
  const sway = Math.sin(phase) * 0.04 * gait.walking;
  const yaw = yawOf(rig.heading.x);
  const body = compose(
    yaw,
    compose(yawOf(-0.7 * twist), compose(pitchOf(-rig.lean.x), rollOf(rig.tip.x + sway))),
  );
  const hips = compose(yaw, yawOf(twist));
  const pivot: Vec3 = [0, HIP[1], 0];
  const up: Vec3 = [0, lift, 0];
  const turn = (direction: Vec3): Vec3 => apply(body, direction);
  const place = (local: Vec3): Vec3 => add(add(apply(body, sub(local, pivot)), pivot), up);
  const hip = (local: Vec3): Vec3 => add(add(apply(hips, sub(local, pivot)), pivot), up);
  return { gait, hip, jig, lift, place, turn, yaw };
};

type Frame = ReturnType<typeof frameOf>;

/** His head: its middle, nodded about his neck, and its own turn on top of his body's. */
const headOf = (leprechaun: Leprechaun, frame: Frame) => {
  const { rig } = leprechaun;
  const own: Mat3 = compose(yawOf(rig.look.x), pitchOf(rig.nod.x));
  const neck: Vec3 = [HEAD[0], HEAD[1] - HEAD_R * 0.8 - 1.2 * rig.nap.x, 0];
  const center = frame.place(add(neck, apply(own, sub(HEAD, [HEAD[0], neck[1], 0]))));
  const turn = (local: Vec3) => frame.turn(apply(own, local));
  const at = (local: Vec3) => add(center, turn(local));
  return { at, center, turn };
};

type Head = ReturnType<typeof headOf>;

/** The near side of a ring round him (a belt, a hat's band): the longest run of it facing the camera. */
const ringPath = (around: (angle: number) => { at: Vec3; out: Vec3 }) => {
  const points = Array.from({ length: RING_SAMPLES }, (_, index) =>
    around((index / RING_SAMPLES) * Math.PI * 2),
  );
  const start = Math.max(
    0,
    points.findIndex(({ out }) => facing(out) <= 0.02),
  );
  const runs: Vec3[][] = [[]];
  for (let step = 0; step <= RING_SAMPLES; step += 1) {
    const sample = points[(start + step) % RING_SAMPLES];
    if (sample && facing(sample.out) > 0.02) {
      runs.at(-1)?.push(sample.at);
    } else if ((runs.at(-1)?.length ?? 0) > 0) {
      runs.push([]);
    }
  }
  const longest = runs.toSorted((a, b) => b.length - a.length)[0] ?? [];
  return longest.length > 1 ? linePath(longest) : "";
};

/** A flat square on a surface (a buckle), its middle, facing `normal`, `up` along it, `half` across. */
const squareOf = (center: Vec3, normal: Vec3, up: Vec3, half: number) => {
  const n = normalize(normal);
  const across = normalize(sub(up, scale(n, dot(up, n))));
  const side = normalize(cross(n, across));
  const corners = [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ].map(([a = 0, b = 0]) => add(center, add(scale(across, a * half), scale(side, b * half))));
  return hullPath(corners);
};

/** A small disc on a surface (an eye, a button, a cheek), seen as it faces. */
const discOf = (center: Vec3, normal: Vec3, radius: number, tall = radius) => {
  const [u, v] = tangentsOf(normal);
  return ellipsePath(ellipseOf(center, [scale(u, radius), scale(v, tall)]));
};

/** His coat: a pot-bellied solid, its belt and buckle, and two gold buttons up its front. */
const coatOf = (frame: Frame) => {
  const center = frame.place(COAT);
  const outline = ellipseOf(center, axesOf({ center, radii: COAT_RADII, turn: frame.turn }));
  const across = Math.sqrt(1 - ((BELT_Y - COAT[1]) / COAT_RADII[1]) ** 2);
  const belt = ringPath((angle) => ({
    at: frame.place([
      COAT[0] + Math.cos(angle) * (COAT_RADII[0] * across + 0.2),
      BELT_Y,
      Math.sin(angle) * (COAT_RADII[2] * across + 0.2),
    ]),
    out: frame.turn([Math.cos(angle), 0, Math.sin(angle)]),
  }));
  const forward = frame.turn([1, 0.05, 0]);
  const front = frame.place([COAT[0] + COAT_RADII[0] * across + 0.3, BELT_Y, 0]);
  const buttons = [21.6, 24.6].map((y) => {
    const out = Math.sqrt(1 - ((y - COAT[1]) / COAT_RADII[1]) ** 2);
    const normal = frame.turn([out, (y - COAT[1]) / COAT_RADII[1], 0]);
    return discOf(frame.place([COAT[0] + COAT_RADII[0] * out + 0.1, y, 0]), normal, 0.65);
  });
  return {
    belt,
    buckle: squareOf(front, forward, frame.turn([0, 1, 0]), 1.35),
    buckleShown: shownOf(forward),
    buttons: buttons.join(""),
    buttonsShown: shownOf(frame.turn([1, 0.4, 0])),
    center,
    depth: depthOf(center),
    hole: squareOf(add(front, scale(forward, 0.1)), forward, frame.turn([0, 1, 0]), 0.6),
    outline,
  };
};

/** How far a swinging foot gets from under his hip before it's drawn up behind him: his legs' reach. */
const SWUNG = 5.5;

/**
 * A swinging foot kept within his legs' reach of its place under him: one
 * left far behind by a run (its swing starts where it lifted) is drawn in
 * and up, his heel kicked up behind him as a runner's is.
 */
const swungOf = (at: Vec3, home: Vec3, swinging: boolean): Vec3 => {
  const far = Math.hypot(at[0] - home[0], at[2] - home[2]);
  if (!swinging || far <= SWUNG) {
    return at;
  }
  const keep = SWUNG / far;
  return [
    home[0] + (at[0] - home[0]) * keep,
    // Kicked up only so far: his knee bends no more than a runner's.
    at[1] + Math.min(2.6, (far - SWUNG) * 0.3),
    home[2] + (at[2] - home[2]) * keep,
  ];
};

/** A foot (0 his left): where it steps, rolling heel to toe, or kicks in the jig, or stamps. */
const footOf = (leprechaun: Leprechaun, frame: Frame, index: number) => {
  const { feet, rig, walker } = leprechaun;
  const side = sideOf(index);
  const foot = feet.feet[index];
  const beat = leprechaun.beat % 1;
  const kick = Math.floor(leprechaun.beat) % 2 === index ? Math.sin(beat * Math.PI) : 0;
  const hop = 4 * beat * (1 - beat) * HOP;
  const stamp = index === leprechaun.hand ? stampOf(leprechaun) : 0;
  const { jig } = frame;
  // Where it's set down (or swinging, lifted), on the ground; in his jig, under him, kicked out a beat.
  const set = swungOf(
    foot ? footIn(foot, { x: walker.x, y: walker.y }) : apply(frame.yaw, [0, 0, side * 2.6]),
    apply(frame.yaw, [0.3, 0, side * 2.6]),
    foot?.planted === false,
  );
  const danced = apply(frame.yaw, [0.3 + 4.6 * kick, hop + 2.4 * kick, side * 2.6]);
  const sole = add(mix(set, danced, jig), [0, 3 * stamp, 0]);
  // Where it is in its stride: down, from heel strike to push off; or swinging through.
  const { duty, walking } = frame.gait;
  const into = (((feet.phase + (STEPS.offsets[index] ?? 0)) % 1) + 1) % 1;
  const t = foot?.planted === false ? duty + foot.swing * (1 - duty) : Math.min(into, duty - 1e-3);
  const roll = rollOfFoot(t, duty) * walking * (1 - jig) - 0.5 * kick * jig + 0.25 * stamp;
  // Rolled about its heel toe up, about its toe heel up; its toes the way it was set down.
  const pivot = roll < 0 ? TOE : HEEL;
  const tipped = pitchOf(roll);
  const landed = foot?.turn ?? rig.heading.x;
  const turn = yawOf(
    landed + Math.atan2(Math.sin(rig.heading.x - landed), Math.cos(rig.heading.x - landed)) * jig,
  );
  const placed = (local: Vec3) =>
    add(sole, apply(turn, add(pivot, apply(tipped, sub(local, pivot)))));
  return {
    across: apply(turn, apply(tipped, [0, 0, 1])),
    ankle: placed([0, ANKLE, 0]),
    buckleShown: smooth((dot(apply(turn, [1, 0, 0]), TOWARD_CAMERA) + 0.55) / 0.4),
    instep: placed([1.4, 1.75, 0]),
    instepNormal: apply(turn, apply(tipped, [0.45, 1, 0])),
    shoe: SHOE.map(placed),
  };
};

/** A leg (0 his left): hip to knee to ankle, the knee bent forward, and its shoe. */
const legOf = (leprechaun: Leprechaun, frame: Frame, index: number) => {
  const side = sideOf(index);
  const foot = footOf(leprechaun, frame, index);
  const hip = frame.hip([HIP[0], HIP[1], side * HIP[2]]);
  const { end, joint } = jointOf(hip, foot.ankle, LEG, apply(frame.yaw, [1, 0.2, side * 0.15]));
  // The shoe goes where the leg gets its ankle to: never left behind off the end of it.
  const short = sub(end, foot.ankle);
  return {
    buckle: squareOf(add(foot.instep, short), foot.instepNormal, foot.across, 0.75),
    buckleShown: foot.buckleShown,
    knee: joint,
    shin: linePath([joint, end]),
    shoe: hullPath(foot.shoe.map((at) => add(at, short))),
    thigh: linePath([hip, joint]),
  };
};

/** An arm (0 his left): shoulder to elbow to hand, after where its spring has the hand. */
const armOf = (leprechaun: Leprechaun, frame: Frame, index: number) => {
  const side = sideOf(index);
  const [x, y, z] = leprechaun.rig.hands[index] ?? [];
  const goal: Vec3 = [x?.x ?? 0, y?.x ?? 0, z?.x ?? 0];
  const shoulder = frame.place([SHOULDER[0], SHOULDER[1], side * SHOULDER[2]]);
  const { end, joint } = jointOf(
    shoulder,
    frame.place(goal),
    ARM,
    frame.turn(elbowPole(goal, index)),
  );
  return {
    elbow: joint,
    hand: end,
    sleeve: linePath([shoulder, joint, end]),
  };
};

/** How near the camera a point is, level: for parts beside one another at different heights. */
const nearOf = (at: Vec3) => at[2] * COS;

/**
 * How far in front of his head each arm is, raised (its forearm's middle;
 * -9, lowered): for `leprechaun.ts` to settle which side of his head each is
 * drawn on without flickering as it swings.
 */
export const armSidesOf = (leprechaun: Leprechaun) => {
  const frame = frameOf(leprechaun);
  const head = nearOf(headOf(leprechaun, frame).center);
  return [0, 1].map((index) => {
    const { elbow, hand } = armOf(leprechaun, frame, index);
    const raised = hand[1] - frame.lift > SHOULDER[1] + 3;
    return { head: raised ? nearOf(mix(elbow, hand, 0.5)) - head : -9 };
  });
};

/** The coat's tails: the stage points each hangs at rest from, root to tip. */
const tailRests = (frame: Frame) =>
  [1, -1].map((side) => TAIL.map(([x, y, z]) => toScreen(frame.place([x, y, z * side]))));

/** The beard's point at rest, chin to tip, on the stage. */
const beardRest = (head: Head) => BEARD.map((local) => toScreen(head.at(local)));

/** Where his floppy bits hang this frame, root first, on the stage about his feet: for `leprechaun.ts` to step. */
export const hangsOf = (leprechaun: Leprechaun) => {
  const frame = frameOf(leprechaun);
  return { beard: beardRest(headOf(leprechaun, frame)), tails: tailRests(frame) };
};

/** A cloth flap along a chain: a strip `widths` wide at each knot, root to tip. */
const flapPath = (points: readonly Point[], widths: readonly number[]) => {
  const left: string[] = [];
  const right: string[] = [];
  for (const [index, at] of points.entries()) {
    const before = points[index - 1] ?? at;
    const after = points[index + 1] ?? at;
    const dx = after.x - before.x;
    const dy = after.y - before.y;
    const length = Math.hypot(dx, dy) || 1;
    const half = (widths[index] ?? 1) / 2;
    left.push(point(at.x - (dy / length) * half, at.y + (dx / length) * half));
    right.push(point(at.x + (dy / length) * half, at.y - (dx / length) * half));
  }
  return `M${left.join("L")}L${right.toReversed().join("L")}Z`;
};

/** The coat's tails, drawn where their chains have them: edge on from his side, broad from behind. */
const tailsOf = (leprechaun: Leprechaun, frame: Frame) => {
  const origin = { x: leprechaun.walker.x, y: leprechaun.walker.y };
  const broad = 0.4 + 0.6 * Math.abs(dot(frame.turn([-1, 0, 0]), TOWARD_CAMERA));
  return leprechaun.tails.map((chain) => {
    const points = chainAbout(chain, origin);
    return {
      d:
        points.length > 1
          ? flapPath(
              points,
              [3, 3.9, 3.7, 2.6].map((w) => w * broad),
            )
          : "",
    };
  });
};

/** How much a direction points toward the camera, level: its tilt up or down aside. */
const forwardLevel = (direction: Vec3) =>
  direction[2] / (Math.hypot(direction[0], direction[2]) || 1);

/** His face, on his head: beard, nose, cheeks, eyes, brows, the mouth in his beard. */
const faceOf = (leprechaun: Leprechaun, head: Head) => {
  const { rig } = leprechaun;
  const r = HEAD_R;
  const on = (direction: Vec3, out = r) => {
    const normal = head.turn(normalize(direction));
    return { at: add(head.center, scale(normal, out)), normal };
  };
  const origin = { x: leprechaun.walker.x, y: leprechaun.walker.y };
  const knots = chainAbout(leprechaun.beard, origin).map(lifted);
  // His beard: the cap of a shell about his jaw, its chin and the front of his jaw (his cheeks and nape
  // bare), and its point hanging from his chin.
  const radii: Vec3 = [r * 1.08, r * 1.02, r * 1.08];
  const shell = { center: head.at([0.4, -0.8, 0]), radii, turn: head.turn };
  const jaw = capPath(shell, BEARD_NORMAL, BEARD_OFFSET);
  const chin = [
    head.at([3.8, -5, 3.6]),
    head.at([3.8, -5, -3.6]),
    head.at([1.2, -7.2, 2.2]),
    head.at([1.2, -7.2, -2.2]),
  ];
  const tuft = knots.length > 1 ? hullPath([...chin, ...knots]) : "";
  const nose = on([1, -0.32, 0], r);
  const mouth = [-0.35, 0, 0.35].map(
    (z, index) => on([0.82, -0.6 + (index === 1 ? -0.06 : 0), z], r * 1.08).at,
  );
  const eyes = [1, -1].map((side) => on([0.8, 0.22, side * 0.5]));
  const brows = [1, -1].map((side) => {
    const lift = 0.4 + 0.08 * rig.brow.x;
    return [on([0.82, lift - 0.06 * rig.brow.x, side * 0.22]).at, on([0.66, lift, side * 0.6]).at];
  });
  return {
    beard: jaw,
    brows: brows.map((line) => linePath(line)),
    browsShown: eyes.map((eye) => shownOf(eye.normal)),
    cheeks: [1, -1].map((side) => on([0.72, -0.24, side * 0.64])),
    eyes,
    // Which way his face looks, level (his nods and bows aside): 1 to the camera, 0 side on, -1 away.
    front: forwardLevel(head.turn([1, 0, 0])),
    hair: capPath(
      { center: head.center, radii: [r * 1.03, r * 1.03, r * 1.03], turn: head.turn },
      HAIR_NORMAL,
      HAIR_OFFSET,
    ),
    moustache: [1, -1].map((side) => on([0.92, -0.4, side * 0.27], r + 0.1)),
    mouth: linePath(mouth),
    mouthShown: shownOf(head.turn([1, -0.4, 0]), 0.15),
    nose,
    tuft,
  };
};

type Face = ReturnType<typeof faceOf>;

/**
 * His ears, either side of his head at his eyes' height, behind his cheeks:
 * on his head under his hair and beard, the far one gone once it's well
 * behind his head.
 */
const earsOf = (head: Head) =>
  [1, -1].map((side) => {
    const at = head.at([-1, 0.5, side * (HEAD_R + 0.1)]);
    const axes = [head.turn([0, 1.35, 0]), head.turn([0.85, 0, 0]), head.turn([0, 0, 0.6])];
    const outline = ellipseOf(at, axes);
    return {
      d: ellipsePath(outline),
      lit: solidPaths(outline).lit,
      shown: smooth((dot(head.turn([0, 0, side]), TOWARD_CAMERA) + 0.35) / 0.25),
    };
  });

/** His hat: on his head, tipped on its own springs (and over his eyes napping), or doffed in his hand. */
const hatOf = (leprechaun: Leprechaun, frame: Frame, head: Head, hands: readonly Vec3[]) => {
  const { rig } = leprechaun;
  const nap = rig.nap.x;
  const tilt = compose(
    yawOf(rig.hatYaw.x),
    compose(pitchOf(rig.hatPitch.x + 0.1 - 0.3 * nap), rollOf(rig.hatRoll.x + 0.07)),
  );
  const worn = (local: Vec3) => head.turn(apply(tilt, local));
  const seat = head.at([0.3 + 1.4 * nap, HEAD_R * 0.76 + rig.hatRise.x - 1 * nap, 0]);
  const doff = doffOf(leprechaun);
  const side = sideOf(leprechaun.hand);
  // Doffed, it's held by its brim on his side, swept crown out from his side, brim down, as he bows.
  const held = compose(
    frame.yaw,
    compose(pitchOf(-0.3 * doff.grip - 0.35 * doff.sweep), rollOf(side * 1.15 * doff.sweep)),
  );
  const carried = (local: Vec3) => apply(held, local);
  const hand = hands[leprechaun.hand] ?? seat;
  const grip = smooth(doff.grip);
  const turn = (local: Vec3) => mix(worn(local), carried(local), grip);
  const center = mix(seat, sub(hand, carried([2.2, 0, side * (BRIM[1] - 0.4)])), grip);
  const at = (local: Vec3) => add(center, turn(local));
  const ring = (radius: number, y: number, count: number) =>
    Array.from({ length: count }, (_, index) => {
      const angle = (index / count) * Math.PI * 2;
      return at([Math.cos(angle) * radius, y, Math.sin(angle) * radius]);
    });
  const crown = hullPath([...ring(CROWN.bottom, 0.3, 16), ...ring(CROWN.top, CROWN.high, 16)]);
  const band = ringPath((angle) => ({
    at: at([Math.cos(angle) * (CROWN.bottom - 0.05), 1.7, Math.sin(angle) * (CROWN.bottom - 0.05)]),
    out: turn([Math.cos(angle), 0, Math.sin(angle)]),
  }));
  const front = turn([1, 0.07, 0]);
  const buckleAt = at([CROWN.bottom + 0.15, 1.8, 0]);
  const topAt = at([0, CROWN.high, 0]);
  return {
    band,
    brim: ellipseOf(center, [turn([BRIM[0], 0, 0]), turn([0, 0, BRIM[1]]), turn([0, 0.45, 0])]),
    buckle: squareOf(buckleAt, front, turn([0, 1, 0]), 1.35),
    buckleShown: shownOf(front),
    center,
    crown,
    grip,
    hole: squareOf(add(buckleAt, scale(front, 0.1)), front, turn([0, 1, 0]), 0.6),
    top: ellipsePath(ellipseOf(topAt, [turn([CROWN.top, 0, 0]), turn([0, 0, CROWN.top])])),
    topAt,
    topShown: shownOf(turn([0, 1, 0]), 0),
  };
};

/** The coin: up off his thumb and back into his hand, turning end over end; its far face and its near. */
const coinPose = (leprechaun: Leprechaun, frame: Frame, hand: Vec3) => {
  const coin = coinOf(leprechaun);
  // Up off his thumb, drifting a little out before him, clear of his hat's brim.
  const at = add(hand, frame.turn([0.5 + coin.height * 0.06, 1.2 + coin.height, 0]));
  const normal = frame.turn([Math.sin(coin.spin), Math.cos(coin.spin), 0]);
  const toward = dot(normal, TOWARD_CAMERA) >= 0 ? 1 : -1;
  const disc = (by: number) => discOf(add(at, scale(normal, by * 0.35)), normal, 2.4);
  return { at, back: disc(-toward), face: disc(toward), shown: coin.shown };
};

const solid = (name: string, outline: Ellipse): [string, Part][] => {
  const { lit, whole } = solidPaths(outline);
  return [
    [name, { d: whole }],
    [`${name}-lit`, { d: lit }],
  ];
};

const faceParts = (face: Face, shut: number): [string, Part][] => [
  ["beard", { d: face.beard }],
  ["tuft", { d: face.tuft }],
  ["hair", { d: face.hair }],
  [
    "nose",
    {
      d: ellipsePath(
        ellipseOf(
          face.nose.at,
          BALL.map((axis) => scale(axis, 1)),
        ),
      ),
      opacity: round(shownOf(face.nose.normal, -0.5)),
    },
  ],
  ["mouth", { d: face.mouth, opacity: round(face.mouthShown) }],
  ...face.moustache.map(({ at, normal }, index): [string, Part] => [
    `moustache-${index}`,
    { d: discOf(at, normal, 1.7, 0.95), opacity: round(shownOf(normal, -0.1)) },
  ]),
  ...face.cheeks.map(({ at, normal }, index): [string, Part] => [
    `cheek-${index}`,
    { d: discOf(at, normal, 1.15), opacity: round(shownOf(normal) * 0.85) },
  ]),
  ...face.eyes.flatMap(({ at, normal }, index): [string, Part][] => {
    const shown = shownOf(normal);
    const [u] = tangentsOf(normal);
    return [
      [
        `eye-${index}`,
        {
          d: ellipsePath(
            ellipseOf(at, [
              [0.8, 0, 0],
              [0, 0.95, 0],
              [0, 0, 0.8],
            ]),
          ),
          opacity: round(shown * (1 - shut)),
        },
      ],
      [
        `lid-${index}`,
        {
          d: linePath([add(at, scale(u, 1)), add(at, scale(u, -1))]),
          opacity: round(shown * shut),
        },
      ],
      [
        `brow-${index}`,
        { d: face.brows[index] ?? "", opacity: round(face.browsShown[index] ?? 0) },
      ],
    ];
  }),
];

export const leprechaunPose = (leprechaun: Leprechaun): Pose => {
  const frame = frameOf(leprechaun);
  const head = headOf(leprechaun, frame);
  const coat = coatOf(frame);
  const legs = [0, 1].map((index) => legOf(leprechaun, frame, index));
  const arms = [0, 1].map((index) => armOf(leprechaun, frame, index));
  const tails = tailsOf(leprechaun, frame);
  const face = faceOf(leprechaun, head);
  const ears = earsOf(head);
  const hat = hatOf(
    leprechaun,
    frame,
    head,
    arms.map(({ hand }) => hand),
  );
  const coin = coinPose(leprechaun, frame, arms[leprechaun.hand]?.hand ?? coat.center);
  const shut = Math.max(leprechaun.rig.nap.x, leprechaun.rig.blink.x);
  const headOutline = ellipseOf(
    head.center,
    BALL.map((axis) => scale(axis, HEAD_R)),
  );

  const parts = Object.fromEntries([
    ...solid("coat", coat.outline),
    ["belt", { d: coat.belt }],
    ["belt-buckle", { d: coat.buckle, opacity: round(coat.buckleShown) }],
    ["belt-hole", { d: coat.hole, opacity: round(coat.buckleShown) }],
    ["buttons", { d: coat.buttons, opacity: round(coat.buttonsShown) }],
    ...tails.map(({ d }, index) => [`tail-${index}`, { d }] as const),
    ...legs.flatMap((leg, index): [string, Part][] => [
      [`thigh-${index}`, { d: leg.thigh }],
      [`shin-${index}`, { d: leg.shin }],
      [`shoe-${index}`, { d: leg.shoe }],
      [`shoe-buckle-${index}`, { d: leg.buckle, opacity: round(leg.buckleShown) }],
    ]),
    ...arms.flatMap(({ hand, sleeve }, index): [string, Part][] => [
      [`sleeve-${index}`, { d: sleeve }],
      [
        `hand-${index}`,
        {
          d: ellipsePath(
            ellipseOf(
              hand,
              BALL.map((axis) => scale(axis, 1.5)),
            ),
          ),
        },
      ],
    ]),
    ...solid("head", headOutline),
    ...ears.flatMap(({ d, lit, shown }, index): [string, Part][] => [
      [`ear-${index}`, { d }],
      [`ear-${index}-lit`, { d: lit }],
      [`ear-${index}-shown`, { opacity: round(shown) }],
    ]),
    ...faceParts(face, shut),
    ...solid("brim", hat.brim),
    ["crown", { d: hat.crown }],
    ["band", { d: hat.band }],
    ["hat-buckle", { d: hat.buckle, opacity: round(hat.buckleShown) }],
    ["hat-hole", { d: hat.hole, opacity: round(hat.buckleShown) }],
    ["crown-top", { d: hat.top, opacity: round(hat.topShown) }],
    ["coin-back", { d: coin.back }],
    ["coin-face", { d: coin.face }],
    ["coin", { opacity: round(coin.shown) }],
    ["face", { opacity: round(smooth((face.front - FACE_AWAY) / 0.2)) }],
  ]) satisfies Record<string, Part>;

  // Back to front: what's nearer the camera is drawn over. His legs under his coat, the nearer over the
  // other; his arms and tails to their side of it (settled in `leprechaun.ts`, so a swing doesn't flicker
  // them); his head over it all, his face over his head as it turns toward the camera, his hat, worn, over
  // all; a hand raised before his face over that, and what's in a hand with it.
  const body = coat.depth;
  const top = body + 10;
  const armKeys = [0, 1].map((index) => {
    if (leprechaun.armOverHead[index]) {
      return top + 1 + index * 0.01;
    }
    return body + (leprechaun.armFront[index] ? 0.4 : -0.4) + index * 0.01;
  });
  const doff = doffOf(leprechaun);
  // Doffed, the hat's over his head till it's swept down clear of it, then goes with the hand that holds
  // it: before him (as he faces the visitor to doff it), over his face and beard, the hand over it.
  const low = hat.grip > 0.5 && doff.t > 0.4 && hat.center[1] < head.center[1];
  const before = nearOf(hat.center) - nearOf(head.center) > -1.5;
  if (low && before) {
    armKeys[leprechaun.hand] = top + 0.7;
  }
  const held = armKeys[leprechaun.hand] ?? body;
  const coinNear = nearOf(coin.at) - nearOf(head.center);
  const flying = coinOf(leprechaun).height > 3;
  const coinKey = flying ? top + (coinNear > 0 ? 2 : -2) : held + 0.005;
  const layers: [string, number][] = [
    ["torso", body],
    ["head", top],
    // Turned away, his face (his beard's point with it) goes under his coat, faded out by then.
    ["face", face.front > FACE_AWAY ? top + 0.1 : body - 0.5],
    ["hat", low ? held - 0.005 : top + 0.5],
    ["coin", coinKey],
    ...[0, 1].map((index): [string, number] => [
      `tail-${index}`,
      body + (leprechaun.tailFront[index] ? 0.3 : -0.3) + index * 0.01,
    ]),
    ...[0, 1].map((index): [string, number] => [
      `leg-${index}`,
      body - 5 + (leprechaun.nearLeg === index ? 0.1 : 0),
    ]),
    ...[0, 1].map((index): [string, number] => [`arm-${index}`, armKeys[index] ?? body]),
  ];
  const crown = toScreen(hat.topAt);
  return {
    at: { x: leprechaun.walker.x, y: leprechaun.walker.y },
    bubble: { x: crown.x, y: crown.y - 10 },
    order: layers.toSorted((a, b) => a[1] - b[1]).map(([name]) => name),
    parts,
    say: leprechaun.emotes.line,
  };
};
