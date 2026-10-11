// Clawd, the critter from Claude Code's banner, as a voxel figure: a clay
// block with two eye slits, a nub of an arm each side and four stubby legs.
// It faces -z, away from the camera, and stands on its origin.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { JUMP_SECONDS } from "../hooks/game";
import { toon } from "./toon";

const CLAY = 0xd9_77_57;
const BODY = { depth: 0.72, height: 0.78, width: 1.25 };
const LEG = { depth: 0.22, height: 0.3, width: 0.15 };
const LEG_X = [-0.45, -0.17, 0.17, 0.45];

export interface Pose {
  time: number;
  // 0 standing, 1 at a full run.
  stride: number;
  // -1 grounded, else 0..1 through a jump.
  jump: number;
  // Sideways velocity in lanes a second, for the lean.
  drift: number;
  // Seconds of crash left.
  crash: number;
  // 0 running away, 1 turned round to the camera.
  facing: number;
}

interface Flourish {
  kind: "glance" | "peek" | "spin";
  start: number;
  seconds: number;
  side: 1 | -1;
}

const SPIN_CHANCE = 0.3;

const sideOf = (): 1 | -1 => (Math.random() < 0.5 ? -1 : 1);

const box = (w: number, h: number, d: number, material: THREE.Material, radius = 0.06) => {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, radius), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
};

export const createClawd = () => {
  const clay = toon(CLAY);
  const ink = toon(0x1a_12_10);

  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const torso = box(BODY.width, BODY.height, BODY.depth, clay, 0.08);
  torso.position.y = LEG.height + BODY.height / 2;
  body.add(torso);

  for (const x of [-0.27, 0.27]) {
    const eye = box(0.12, 0.24, 0.04, ink, 0.02);
    eye.position.set(x, LEG.height + BODY.height * 0.62, -BODY.depth / 2 - 0.005);
    body.add(eye);
  }

  const arms = [-1, 1].map((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * (BODY.width / 2), LEG.height + BODY.height * 0.42, 0);
    const arm = box(0.26, 0.2, 0.3, clay, 0.05);
    arm.position.x = side * 0.11;
    pivot.add(arm);
    body.add(pivot);
    return pivot;
  });

  const legs = LEG_X.map((x) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, LEG.height, 0);
    const leg = box(LEG.width, LEG.height, LEG.depth, clay, 0.04);
    leg.position.y = -LEG.height / 2;
    pivot.add(leg);
    body.add(pivot);
    return pivot;
  });

  // Squash and stretch: a damped spring around 1, kicked by takeoffs and
  // landings. Positive stretches tall and thin, negative squashes flat.
  const spring = { at: 0, lastTime: 0, velocity: 0 };

  // Flourishes, for character: now and then on the run Clawd glances back
  // at the camera and waves, peeks off to one side, or spins through a jump.
  let flourish: Flourish | null = null;
  let nextFlourishAt = 4;

  const impact = (kind: "jump" | "land") => {
    spring.velocity += kind === "land" ? -7 : 5;
    if (kind === "jump" && !flourish && Math.random() < SPIN_CHANCE) {
      flourish = { kind: "spin", seconds: JUMP_SECONDS, side: sideOf(), start: spring.lastTime };
    }
  };

  // How far round the flourish turns Clawd now, and whether it is waving.
  const turn = (time: number) => {
    if (!flourish) {
      return { isWaving: false, yaw: 0 };
    }
    const t = (time - flourish.start) / flourish.seconds;
    if (t >= 1) {
      flourish = null;
      nextFlourishAt = time + 5 + Math.random() * 6;
      return { isWaving: false, yaw: 0 };
    }
    if (flourish.kind === "spin") {
      const eased = t * t * (3 - 2 * t);
      return { isWaving: false, yaw: flourish.side * Math.PI * 2 * eased };
    }
    // Turns quickly, holds, turns back.
    const hold = Math.min(1, Math.sin(Math.PI * t) * 1.8);
    const reach = flourish.kind === "glance" ? 0.8 : 0.45;
    return {
      isWaving: flourish.kind === "glance" && hold > 0.8,
      yaw: flourish.side * Math.PI * reach * hold,
    };
  };

  // A crash cuts a flourish short; a steady run, due one, starts one.
  const consider = (pose: Pose) => {
    const isRunning = pose.stride > 0.8 && pose.facing < 0.05 && pose.jump < 0;
    if (pose.crash > 0) {
      flourish = null;
    } else if (!flourish && isRunning && pose.time >= nextFlourishAt) {
      const kind = Math.random() < 0.6 ? "glance" : "peek";
      flourish = { kind, seconds: kind === "glance" ? 1.3 : 0.8, side: sideOf(), start: pose.time };
    }
    return turn(pose.time);
  };

  const update = (pose: Pose) => {
    const { isWaving, yaw } = consider(pose);
    const dt = Math.min(0.1, Math.max(0, pose.time - spring.lastTime));
    spring.lastTime = pose.time;
    spring.velocity += (-260 * spring.at - 14 * spring.velocity) * dt;
    spring.at += spring.velocity * dt;
    const cycle = pose.time * 15;
    const swing = Math.sin(cycle) * 0.9 * pose.stride;
    for (const [i, leg] of legs.entries()) {
      const stride = i % 2 === 0 ? swing : -swing;
      leg.rotation.x = pose.jump >= 0 ? -0.6 : stride;
    }
    for (const [i, arm] of arms.entries()) {
      arm.rotation.x = (i === 0 ? -swing : swing) * 0.7;
      arm.rotation.z = 0;
    }

    const bob = Math.abs(Math.sin(cycle)) * 0.08 * pose.stride;
    const breathe = Math.sin(pose.time * 2.5) * 0.02 * (1 - pose.stride);
    const lift = pose.jump >= 0 ? Math.sin(Math.PI * pose.jump) * 2.1 : 0;
    body.position.y = bob + breathe + lift;
    // In the air Clawd stretches with speed, most at takeoff and touchdown.
    const flight = pose.jump >= 0 ? Math.abs(Math.cos(Math.PI * pose.jump)) * 0.12 : 0;
    const stretch = THREE.MathUtils.clamp(spring.at + flight, -0.4, 0.35);
    const thin = 1 - stretch * 0.5;
    body.scale.set(thin * (1 + breathe), (1 + stretch) * (1 - breathe), thin * (1 + breathe));
    body.rotation.x = pose.jump >= 0 ? -Math.sin(Math.PI * pose.jump) * 0.25 : -0.12 * pose.stride;
    body.rotation.z =
      -THREE.MathUtils.clamp(pose.drift, -9, 9) * 0.035 +
      (pose.crash > 0 ? Math.sin(pose.time * 50) * 0.12 : 0);

    // Turned round, Clawd waves at the camera with its right arm.
    if (pose.facing > 0.5 || isWaving) {
      const [, wave] = arms;
      if (wave) {
        wave.rotation.x = 0;
        wave.rotation.z = 1.2 + Math.sin(pose.time * 9) * 0.45;
      }
    }
    root.rotation.y = Math.PI * pose.facing + yaw;
    clay.emissive.setHex(pose.crash > 0 && Math.floor(pose.time * 16) % 2 === 0 ? 0x66_10_00 : 0);
  };

  return { impact, root, update };
};
