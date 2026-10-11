// The line the runner races down, dressed like Subway Surfers: three tracks
// of chunky ties on warm ballast between low tagged walls, green verges with
// trees and lamps, pastel houses, a hazy skyline, a bright sky, and the
// camera riding high behind Clawd. What scrolls is recycled along one period.
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import type { Game } from "../hooks/game";
import { RUNNER_D } from "../hooks/game";
import { createClawd } from "./clawd";
import { LANE_WIDTH, ROOF_Y, UNIT, createProps } from "./props";
import { ballast, facade, wall } from "./textures";
import { toon } from "./toon";
import { createVfx } from "./vfx";

const PERIOD = 176;
const BEHIND = 20;
// A pale haze the fog shares, so the distance melts into the sky.
const SKY_TOP = new THREE.Color(0x7c_c2_ea);
const HORIZON = new THREE.Color(0xa9_d9_ed);
const GAUGE = 1.44;
const BED_X = LANE_WIDTH * 1.5 + 0.9;
const WALL_X = BED_X + 0.35;
// Wide enough to see all three tracks however narrow the pane is.
const MIN_HORIZONTAL_FOV = 66;
const FOV = 55;
const PASTELS = ["#f4c38e", "#9fd3e6", "#f29b8c", "#b9a6e8", "#f6e08f", "#a8dba0"];
const ROOFS = [0x5b_4b_8f, 0xc0_50_4d, 0x3f_6f_8f, 0x7a_4a_3a];

// Where a point `offset` meters along the period sits once the world has
// scrolled `scroll` meters: in front of the camera, never more than BEHIND past it.
const wrap = (offset: number, scroll: number) =>
  ((((offset + scroll) % PERIOD) + PERIOD) % PERIOD) - (PERIOD - BEHIND);

// Distance ahead of the runner in track units, as world z (the runner at 0).
const ahead = (d: number) => -(d - RUNNER_D) * UNIT;

// The same scatter every run.
const jitter = (n: number) => {
  const s = Math.sin(n * 91.345) * 47_453.5453;
  return s - Math.floor(s);
};

const sky = () => {
  const material = new THREE.ShaderMaterial({
    depthWrite: false,
    fog: false,
    fragmentShader: `
      uniform vec3 top; uniform vec3 horizon; varying vec3 vDir;
      void main() {
        float h = clamp(normalize(vDir).y, 0.0, 1.0);
        gl_FragColor = vec4(mix(horizon, top, pow(h, 0.5)), 1.0);
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide,
    uniforms: { horizon: { value: HORIZON }, top: { value: SKY_TOP } },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), material);
};

const solid = (color: number) => toon(color);

const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) => {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(x, y, z);
  object.castShadow = true;
  object.receiveShadow = true;
  return object;
};

const leaves = [0x5c_bf_3a, 0x4f_ad_35, 0x72_cc_48].map((color) => toon(color));
const bark = solid(0x8a_5a_3a);
const makeTree = (seed: number) => {
  const tree = new THREE.Group();
  const size = 1.6 + jitter(seed) * 0.9;
  tree.add(mesh(new THREE.CylinderGeometry(0.22, 0.3, 2.2, 8), bark, 0, 1.1, 0));
  const crown = leaves[Math.floor(jitter(seed + 1) * leaves.length)] ?? bark;
  tree.add(mesh(new THREE.IcosahedronGeometry(size, 1), crown, 0, 2.2 + size * 0.8, 0));
  tree.add(
    mesh(new THREE.IcosahedronGeometry(size * 0.7, 1), crown, size * 0.5, 2.6 + size * 0.4, 0.3),
  );
  return tree;
};

const lampPole = solid(0x2f_4f_4a);
const lampGlow = new THREE.MeshStandardMaterial({
  color: 0xff_f1_c8,
  emissive: 0xff_dc_8a,
  emissiveIntensity: 2.2,
});
const makeLamp = (side: number) => {
  const lamp = new THREE.Group();
  lamp.add(mesh(new THREE.CylinderGeometry(0.09, 0.12, 4.6, 10), lampPole, 0, 2.3, 0));
  lamp.add(mesh(new THREE.BoxGeometry(0.9, 0.1, 0.1), lampPole, -side * 0.4, 4.55, 0));
  lamp.add(mesh(new THREE.SphereGeometry(0.24, 16, 12), lampGlow, -side * 0.8, 4.35, 0));
  return lamp;
};

const makeHouse = (seed: number, side: number) => {
  const house = new THREE.Group();
  const width = 7 + jitter(seed) * 4;
  const height = 6 + jitter(seed + 2) * 7;
  const depth = 9 + jitter(seed + 3) * 5;
  const color = PASTELS[Math.floor(jitter(seed + 4) * PASTELS.length)] ?? "#f4c38e";
  const map = facade(seed, color);
  map.repeat.set(width / 5, height / 5);
  const walls = toon(color, { map });
  const body = mesh(new THREE.BoxGeometry(width, height, depth), walls, 0, height / 2, 0);
  house.add(body);
  const roof = new THREE.ConeGeometry(Math.max(width, depth) * 0.75, 3 + jitter(seed + 5) * 2, 4);
  roof.rotateY(Math.PI / 4);
  const top = mesh(
    roof,
    solid(ROOFS[Math.floor(jitter(seed + 6) * ROOFS.length)] ?? 0x5b_4b_8f),
    0,
    0,
    0,
  );
  top.scale.set(width / Math.max(width, depth), 1, depth / Math.max(width, depth));
  top.position.y = height + 1.4;
  house.add(top);
  house.position.x = side * (WALL_X + 9 + width / 2 + jitter(seed + 7) * 4);
  return { house, map, walls };
};

export const createScene = (renderer: THREE.WebGLRenderer) => {
  const scene = new THREE.Scene();
  scene.add(sky());
  scene.fog = new THREE.Fog(HORIZON, 50, 190);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(
    new RoomEnvironment(),
    0.04,
  ).texture;
  scene.environmentIntensity = 0.45;

  // The sky does most of the lighting; the sun only shapes and casts.
  scene.add(new THREE.HemisphereLight(0xf0_f8_ff, 0x82_77_65, 2.2));
  const sun = new THREE.DirectionalLight(0xff_e4_be, 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  Object.assign(sun.shadow.camera, { bottom: -45, far: 160, left: -25, right: 25, top: 45 });
  scene.add(sun, sun.target);

  const strip: { object: THREE.Object3D; offset: number }[] = [];
  const along = (object: THREE.Object3D, offset: number) => {
    scene.add(object);
    strip.push({ object, offset });
  };

  const bedTexture = ballast();
  bedTexture.repeat.set(3, PERIOD / 6);
  const bedMaterial = toon(0xff_ff_ff, { map: bedTexture });
  const bed = new THREE.Mesh(new THREE.PlaneGeometry(BED_X * 2, PERIOD), bedMaterial);
  bed.rotation.x = -Math.PI / 2;
  bed.position.z = BEHIND - PERIOD / 2;
  bed.receiveShadow = true;
  scene.add(bed);

  const grass = new THREE.Mesh(new THREE.PlaneGeometry(400, PERIOD + 400), solid(0x7c_c9_5a));
  grass.rotation.x = -Math.PI / 2;
  grass.position.set(0, -0.02, -PERIOD / 2);
  grass.receiveShadow = true;
  scene.add(grass);

  const rail = new THREE.MeshStandardMaterial({
    color: 0xc9_ce_d6,
    metalness: 0.6,
    roughness: 0.5,
  });
  for (const lane of [-1, 0, 1]) {
    for (const side of [-1, 1]) {
      scene.add(
        mesh(
          new THREE.BoxGeometry(0.12, 0.2, PERIOD),
          rail,
          lane * LANE_WIDTH + (side * GAUGE) / 2,
          0.3,
          BEHIND - PERIOD / 2,
        ),
      );
    }
  }

  const TIE_GAP = 1.35;
  const tiesPerLane = Math.floor(PERIOD / TIE_GAP);
  const ties = new THREE.InstancedMesh(
    new THREE.BoxGeometry(2.4, 0.2, 0.42),
    solid(0x9a_55_30),
    tiesPerLane * 3,
  );
  ties.castShadow = true;
  ties.receiveShadow = true;
  ties.frustumCulled = false;
  scene.add(ties);

  const WALL_SEGMENT = 16;
  const wallSegments = [-1, 1].flatMap((side) =>
    Array.from({ length: PERIOD / WALL_SEGMENT }, (_, i) => {
      const map = wall(side * 100 + i);
      const material = toon(0xff_ff_ff, { map });
      const segment = mesh(
        new THREE.BoxGeometry(0.5, 1.6, WALL_SEGMENT - 0.1),
        material,
        side * WALL_X,
        0.8,
      );
      along(segment, i * WALL_SEGMENT);
      return { map, material };
    }),
  );

  for (const side of [-1, 1]) {
    for (let i = 0; i < PERIOD / 11; i += 1) {
      const tree = makeTree(side * 50 + i);
      tree.position.x = side * (WALL_X + 2.5 + jitter(side * 9 + i) * 4);
      along(tree, i * 11 + jitter(i + side) * 5);
    }
    for (let i = 0; i < PERIOD / 22; i += 1) {
      const lamp = makeLamp(side);
      lamp.position.x = side * (WALL_X + 0.9);
      along(lamp, i * 22 + (side > 0 ? 11 : 0));
    }
  }

  const houses = [-1, 1].flatMap((side) =>
    Array.from({ length: PERIOD / 22 }, (_, i) => {
      const { house, map, walls } = makeHouse(side * 70 + i * 3, side);
      along(house, i * 22 + (side > 0 ? 9 : 0));
      return { map, walls };
    }),
  );

  const haze = new THREE.MeshStandardMaterial({ color: 0xa9_c4_e4, roughness: 1 });
  for (let i = 0; i < 26; i += 1) {
    const width = 10 + jitter(i) * 18;
    const height = 25 + jitter(i + 40) * 55;
    const tower = new THREE.Mesh(new THREE.BoxGeometry(width, height, 10), haze);
    tower.position.set(
      (i - 13) * 16 + jitter(i + 9) * 8,
      height / 2 - 2,
      -230 - jitter(i + 3) * 40,
    );
    scene.add(tower);
  }

  const clawd = createClawd();
  clawd.root.scale.setScalar(1.7);
  scene.add(clawd.root);
  const props = createProps(scene);
  const vfx = createVfx(scene);
  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(0.85, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({
      color: 0x2a_24_30,
      depthWrite: false,
      opacity: 0.3,
      transparent: true,
    }),
  );
  scene.add(blob);

  const camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.1, 800);
  const matrix = new THREE.Matrix4();
  let isCoarse = false;
  let facing = 0;
  let stride = 0;
  let cameraX = 0;
  let cameraY = 0;
  let lastX = 1;
  // Last frame's run, to see what just happened: a coin, a crash, a landing.
  const last = { coins: 0, crashes: 0, jumps: 0, landings: 0, scroll: 0, step: 0 };
  // Wall-clock seconds, so Clawd breathes and coins spin while the run is paused.
  let elapsed = 0;

  const resize = (width: number, height: number) => {
    camera.aspect = width / height;
    const wide = THREE.MathUtils.degToRad(MIN_HORIZONTAL_FOV) / 2;
    camera.fov = Math.max(
      FOV,
      THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(wide) / camera.aspect)),
    );
    camera.updateProjectionMatrix();
    vfx.resize(height, camera.fov);
  };

  // Drawn in terminal blocks, two pixels a cell: textures only become noise
  // there, so surfaces go flat, the fog closes in, and Clawd grows.
  const setCoarse = (coarse: boolean) => {
    if (coarse === isCoarse) {
      return;
    }
    isCoarse = coarse;
    bedMaterial.map = coarse ? null : bedTexture;
    bedMaterial.color.setHex(coarse ? 0x6a_55_50 : 0xff_ff_ff);
    bedMaterial.needsUpdate = true;
    for (const { map, material } of wallSegments) {
      material.map = coarse ? null : map;
      material.color.setHex(coarse ? 0xe8_c9_a0 : 0xff_ff_ff);
      material.needsUpdate = true;
    }
    for (const { map, walls } of houses) {
      walls.map = coarse ? null : map;
      walls.needsUpdate = true;
    }
    scene.fog = new THREE.Fog(HORIZON, coarse ? 35 : 50, coarse ? 140 : 190);
    clawd.root.scale.setScalar(coarse ? 2.1 : 1.7);
    vfx.setCoarse(coarse);
  };

  const effects = (game: Game, dt: number, runnerX: number, isActive: boolean) => {
    const base = game.roof * ROOF_Y;
    const scrolled = (game.scroll - last.scroll) * UNIT;
    const scale = clawd.root.scale.x;
    if (game.coins > last.coins) {
      vfx.coin(new THREE.Vector3(runnerX, base + 1.4 * scale, -0.6));
    }
    if (game.crashes > last.crashes) {
      vfx.crash(new THREE.Vector3(runnerX, base + scale, -1));
    }
    if (game.jumps > last.jumps) {
      clawd.impact("jump");
    }
    if (game.landings > last.landings) {
      clawd.impact("land");
      vfx.puff(new THREE.Vector3(runnerX, base, 0.2), 12, 1.4);
    }
    last.step += dt;
    if (isActive && game.jump < 0 && game.roof === 0 && last.step > 0.09) {
      last.step = 0;
      vfx.puff(new THREE.Vector3(runnerX, 0, 0.4), 1, 0.7);
    }
    vfx.wind(camera, dt > 0 ? scrolled / dt : 0, dt);
    vfx.update(dt, scrolled);
    Object.assign(last, {
      coins: game.coins,
      crashes: game.crashes,
      jumps: game.jumps,
      landings: game.landings,
      scroll: game.scroll,
    });
  };

  const update = (game: Game, dt: number, isActive: boolean) => {
    const scroll = game.scroll * UNIT;
    elapsed += dt;

    for (let lane = 0; lane < 3; lane += 1) {
      for (let i = 0; i < tiesPerLane; i += 1) {
        matrix.makeTranslation((lane - 1) * LANE_WIDTH, 0.1, wrap(i * TIE_GAP, scroll));
        ties.setMatrixAt(lane * tiesPerLane + i, matrix);
      }
    }
    ties.instanceMatrix.needsUpdate = true;
    bedTexture.offset.y = (scroll / PERIOD) * bedTexture.repeat.y;
    for (const { object, offset } of strip) {
      object.position.z = wrap(offset, scroll);
    }

    props.update(game.things, ahead, elapsed);

    const step = Math.min(1, dt * 4);
    facing += ((isActive ? 0 : 1) - facing) * step;
    stride += ((isActive ? 1 : 0) - stride) * step;
    const runnerX = (game.x - 1) * LANE_WIDTH;
    const drift = dt > 0 ? (game.x - lastX) / dt : 0;
    lastX = game.x;
    clawd.root.position.set(runnerX, 0.2 + game.roof * ROOF_Y, 0);
    clawd.update({ crash: game.crash, drift, facing, jump: game.jump, stride, time: elapsed });

    const jumpLift = game.jump >= 0 ? Math.sin(Math.PI * game.jump) * 2.1 * clawd.root.scale.x : 0;
    blob.position.set(runnerX, game.roof * ROOF_Y + 0.04, 0);
    blob.scale.setScalar(Math.max(0.4, 1 - jumpLift * 0.15) * (clawd.root.scale.x / 1.7));
    effects(game, dt, runnerX, isActive);

    // Held well back and barely following sideways, so all three lanes stay
    // framed and Clawd moves across them. A tall pane can't see the lanes
    // from that far without a fisheye, so it comes closer and looks down;
    // blocks sit closer still, for size.
    cameraX += (runnerX * 0.13 - cameraX) * Math.min(1, dt * 5);
    cameraY += (game.roof * ROOF_Y * 0.8 - cameraY) * Math.min(1, dt * 4);
    const shake = game.crash > 0 ? Math.sin(elapsed * 70) * game.crash * 0.3 : 0;
    const lift = game.jump >= 0 ? Math.sin(Math.PI * game.jump) * 0.5 : 0;
    const wide = THREE.MathUtils.clamp((camera.aspect - 0.4) / 0.6, 0, 1);
    const back = THREE.MathUtils.lerp(6.5, isCoarse ? 9.5 : 12.4, wide);
    const up = THREE.MathUtils.lerp(5.6, isCoarse ? 4.8 : 5.1, wide);
    camera.position.set(cameraX + shake, up + lift + cameraY, back);
    camera.lookAt(
      cameraX * 0.9,
      THREE.MathUtils.lerp(-2.2, 1.2, wide) + lift * 0.5 + cameraY,
      THREE.MathUtils.lerp(-6, -11, wide),
    );

    sun.position.set(runnerX - 12, 25, 12);
    sun.target.position.set(runnerX, 0, -20);
  };

  return { camera, resize, scene, setCoarse, update };
};
