import type { Object3D } from "three";
import { Vector3 } from "three";

import type { Pour, createHoneyDrops } from "./honey-drops";
import { DIPPER_AXIS, DIPPER_TIP, HONEY_LEVEL, JAR_RADIUS, LIP_TOP, MOUTH_RADIUS } from "./models";

// Below this the head is still inside the jar and must rise through the mouth.
const CLEAR_OF_RIM = LIP_TOP + 0.2;
/**
 * The height the dipper's tip is carried at. Tied to the rim: carried any lower,
 * the tip never clears it and the dipper can't leave the mouth.
 */
const CARRY_HEIGHT = CLEAR_OF_RIM + 0.15;
// How far from the jar it can be carried before leaving the frame.
const REACH = 2.3;
const HOLD_RATE = 22;
const RETURN_RATE = 7;
const TURN_RATE = 12;
// A dipper holds a few seconds of drizzle; dipping it back in refills it.
const LOAD_SECONDS = 7;
// Hovered, it rises out of the honey a little, to say it can be picked up.
const HOVER_LIFT = 0.14;
const LEAN = 0.05;
const MAX_LEAN = 0.45;
// Held like a pen: the handle up and toward the viewer's right, in the scene's frame.
const HELD_AXIS = new Vector3(0.55, 0.78, 0.3).normalize();
const UP = new Vector3(0, 1, 0);

type Drops = ReturnType<typeof createHoneyDrops>;

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

// Where honey falling from (x, z) lands: in the jar, down the glass, or on the floor.
const below = (x: number, z: number) => {
  const distance = Math.hypot(x, z);
  if (distance < MOUTH_RADIUS - 0.06) {
    return { intoJar: true, x, z };
  }
  const push = distance < JAR_RADIUS + 0.1 ? (JAR_RADIUS + 0.12) / (distance || 1) : 1;
  return { intoJar: false, x: x * push, z: z * push };
};

/**
 * The dipper as something you carry: lifted, it follows its aim at
 * CARRY_HEIGHT and drizzles from its tip until it runs dry; dropped, it goes
 * back through the mouth to rest in the honey and refill. Coordinates are in
 * the jar's frame.
 */
export const createDipper = ({ dipper, drops }: { dipper: Object3D; drops: Drops }) => {
  const tip = DIPPER_TIP.clone();
  const last = tip.clone();
  const goal = new Vector3();
  const velocity = new Vector3();
  const axis = DIPPER_AXIS.clone();
  const target = new Vector3();
  const lean = new Vector3();
  let aim: { x: number; z: number } | undefined;
  let hovered = false;
  let load = 1;
  let pour: Pour | undefined;

  const inJar = () => tip.y < CLEAR_OF_RIM && Math.hypot(tip.x, tip.z) < MOUTH_RADIUS;

  const placeGoal = () => {
    if (aim) {
      goal.set(aim.x, CARRY_HEIGHT, aim.z);
      const far = Math.hypot(goal.x, goal.z);
      if (far > REACH) {
        goal.x *= REACH / far;
        goal.z *= REACH / far;
      }
      // Rising out of the jar, stay inside the mouth until the head clears the rim.
      const reach = Math.hypot(goal.x, goal.z);
      const limit = MOUTH_RADIUS - 0.3;
      if (tip.y < CLEAR_OF_RIM && reach > limit) {
        goal.x *= limit / reach;
        goal.z *= limit / reach;
      }
    } else if (!inJar() && Math.hypot(tip.x - DIPPER_TIP.x, tip.z - DIPPER_TIP.z) > 0.15) {
      goal.set(DIPPER_TIP.x, CARRY_HEIGHT, DIPPER_TIP.z);
    } else {
      goal.copy(DIPPER_TIP);
      if (hovered) {
        goal.addScaledVector(DIPPER_AXIS, HOVER_LIFT);
      }
    }
  };

  const stepHoney = (seconds: number) => {
    if (tip.y < HONEY_LEVEL - 0.02) {
      load = 1;
    }
    const lifted = tip.y > HONEY_LEVEL + 0.15;
    if (!pour && lifted && load > 0.05) {
      const landing = below(tip.x, tip.z);
      pour = drops.pour(landing.x, landing.z, tip.y, landing.intoJar);
    }
    if (!pour) {
      return;
    }
    load -= seconds / LOAD_SECONDS;
    if (!lifted || load <= 0.05) {
      pour.release();
      pour = undefined;
      return;
    }
    const landing = below(tip.x, tip.z);
    pour.steer(landing.x, landing.z, tip.y, landing.intoJar, load);
  };

  /** Steps the dipper; `jarAngle` is the jar's turn, to hold the handle steady on screen. Returns whether it moved. */
  const update = (seconds: number, jarAngle: number) => {
    placeGoal();
    tip.lerp(goal, 1 - Math.exp(-(aim ? HOLD_RATE : RETURN_RATE) * seconds));
    velocity.subVectors(tip, last).divideScalar(Math.max(seconds, 1e-3));
    last.copy(tip);

    // Out of the jar it is held upright and leans into its motion, the head trailing.
    const out = smoothstep(DIPPER_TIP.y, CARRY_HEIGHT, tip.y);
    lean.copy(velocity).setY(0).multiplyScalar(LEAN).clampLength(0, MAX_LEAN);
    target
      .copy(HELD_AXIS)
      .applyAxisAngle(UP, -jarAngle)
      .add(lean)
      .normalize()
      .lerp(DIPPER_AXIS, 1 - out)
      .normalize();
    axis.lerp(target, 1 - Math.exp(-TURN_RATE * seconds)).normalize();
    dipper.position.copy(tip);
    dipper.quaternion.setFromUnitVectors(UP, axis);

    stepHoney(seconds);
    return aim !== undefined || tip.distanceTo(goal) > 1e-3 || axis.angleTo(target) > 1e-3;
  };

  return {
    /** Lets go: it returns to the jar. */
    drop: () => {
      aim = undefined;
    },
    held: () => aim !== undefined,
    /** Raises it a little while the pointer is over it. */
    hover: (over: boolean) => {
      hovered = over;
    },
    /** Picks the dipper up toward (x, z). */
    lift: (x: number, z: number) => {
      aim = { x, z };
    },
    /** Carries it on toward (x, z) while held. */
    moveTo: (x: number, z: number) => {
      if (aim) {
        aim = { x, z };
      }
    },
    /** Whether honey is running off it. */
    pouring: () => pour !== undefined,
    /** Where the tip is, in the jar's frame. */
    tip: () => tip.clone(),
    update,
  };
};
