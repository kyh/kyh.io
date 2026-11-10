import type { Material, Object3D } from "three";
import {
  BackSide,
  BoxGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  NeutralToneMapping,
  PCFShadowMap,
  PerspectiveCamera,
  Plane,
  PlaneGeometry,
  PMREMGenerator,
  Raycaster,
  Scene,
  ShadowMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";

import type { Pour } from "./honey-drops";
import { createHoneyDrops } from "./honey-drops";
import { JAR_RADIUS, MOUTH_RADIUS, createHoneypot } from "./models";

const BACKGROUND = "#f5f5f7";
const TARGET = new Vector3(0, 1.2, 0);
const FOV = 28;
const ELEVATION = 0.44;
const TAP_SLOP = 6;
// A press that stays put this long pours; one that moves first turns the jar.
// Deciding on time, not on the first move, keeps a scroll from pouring.
const HOLD_MS = 140;
const IDLE_SPIN = 0.12;
const VELOCITY_WINDOW_MS = 80;
const STALE_RELEASE_MS = 40;

// Framing in world units around TARGET: tight like a product shot, tighter in portrait.
const framing = (aspect: number) =>
  aspect < 1 ? { halfHeight: 2.05, halfWidth: 2.1 } : { halfHeight: 1.95, halfWidth: 2.4 };

// One long pour that teaches holding, then two taps.
const INTRO = [
  { at: 0.6, hold: 0.55, x: 1.5, z: 0.4 },
  { at: 1.9, hold: 0, x: -1.6, z: -0.15 },
  { at: 2.3, hold: 0, x: -1.4, z: 0.45 },
];

export interface HoneypotEvents {
  /** The first frame is on screen. */
  onReady: () => void;
  /** The person touched the jar for the first time. */
  onInteract: () => void;
  /** The GPU dropped the context; the canvas is dead. */
  onLost: () => void;
}

/** A dim studio for reflections: a dark shell, a softbox above, two tall strips, a warm card behind. */
const studio = () => {
  const room = new Scene();
  const shell = new SphereGeometry(10, 32, 16);
  const position = shell.getAttribute("position");
  const colors: number[] = [];
  for (let index = 0; index < position.count; index += 1) {
    const t = (position.getY(index) / 10 + 1) / 2;
    const value = 0.02 + 0.1 * t * t;
    colors.push(value, value * 0.98, value * 0.95);
  }
  shell.setAttribute("color", new Float32BufferAttribute(colors, 3));
  room.add(new Mesh(shell, new MeshBasicMaterial({ side: BackSide, vertexColors: true })));
  const lights = [
    { at: [0, 8, 0], intensity: 3, size: [6, 0.1, 6] },
    { at: [-6, 2.5, 2.5], intensity: 2.5, size: [2.4, 7, 0.1] },
    { at: [6, 2.5, 1.5], intensity: 2, size: [2, 7, 0.1] },
    { at: [0, 2, -7], color: "#ffe2b8", intensity: 1.6, size: [5, 3, 0.1] },
    { at: [0, -0.05, 0], intensity: 0.9, size: [10, 0.1, 10] },
  ];
  for (const { at, color = "#ffffff", intensity, size } of lights) {
    const [w = 1, h = 1, d = 1] = size;
    const [x = 0, y = 0, z = 0] = at;
    const panel = new Mesh(
      new BoxGeometry(w, h, d),
      new MeshBasicMaterial({ color: new Color(color).multiplyScalar(intensity) }),
    );
    panel.position.set(x, y, z);
    panel.lookAt(0, 1, 0);
    room.add(panel);
  }
  return room;
};

const radialTexture = (stops: [number, string][]) => {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
    for (const [offset, color] of stops) {
      gradient.addColorStop(offset, color);
    }
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
};

const floorDecal = (size: number, texture: CanvasTexture, y: number) => {
  const mesh = new Mesh(
    new PlaneGeometry(size, size),
    new MeshBasicMaterial({ depthWrite: false, map: texture, transparent: true }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  return mesh;
};

const disposeTree = (root: Object3D) => {
  root.traverse((object) => {
    if (!(object instanceof Mesh)) {
      return;
    }
    object.geometry.dispose();
    const materials: Material[] = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value instanceof CanvasTexture) {
          value.dispose();
        }
      }
      material.dispose();
    }
  });
};

interface Press {
  id: number;
  downAt: number;
  downX: number;
  downY: number;
  x: number;
  y: number;
  rotationAtGrab: number;
  samples: { t: number; x: number }[];
  mode: { kind: "deciding" } | { kind: "turning" } | { kind: "pouring"; pour: Pour };
}

interface Aim {
  x: number;
  z: number;
  intoJar: boolean;
}

/**
 * Mounts the honeypot on a canvas: drag turns it, a press pours honey until
 * released. Throws when WebGL is unavailable. Returns its teardown.
 */
export const mountHoneypot = (canvas: HTMLCanvasElement, events: HoneypotEvents) => {
  const renderer = new WebGLRenderer({ antialias: true, canvas });
  renderer.toneMapping = NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  // Honey blurs what it shows (a roughness floor), so half resolution is invisible.
  renderer.transmissionResolutionScale = 0.5;

  const scene = new Scene();
  scene.background = new Color(BACKGROUND);
  const pmrem = new PMREMGenerator(renderer);
  const room = studio();
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  disposeTree(room);
  scene.environmentIntensity = 0.9;

  const camera = new PerspectiveCamera(FOV, 1, 0.1, 100);

  // Backlit, so the honey's glow and shadow fall toward the viewer.
  const sun = new DirectionalLight("#fff6ea", 2.2);
  sun.position.set(-1.4, 9, -3.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -3;
  sun.shadow.camera.right = 3;
  sun.shadow.camera.top = 3;
  sun.shadow.camera.bottom = -3;
  sun.shadow.radius = 8;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);

  const floor = new Mesh(
    new PlaneGeometry(40, 40),
    new ShadowMaterial({ color: new Color("#3a1800"), opacity: 0.22 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  scene.add(
    floorDecal(
      2.3,
      radialTexture([
        [0, "rgba(40, 20, 4, 0.5)"],
        [0.7, "rgba(40, 20, 4, 0.5)"],
        [0.85, "rgba(40, 20, 4, 0)"],
      ]),
      0.001,
    ),
  );

  // Light through the honey pools into a warm spot inside its shadow.
  const caustic = floorDecal(
    2.2,
    radialTexture([
      [0, "rgba(255, 150, 30, 0.9)"],
      [0.4, "rgba(230, 110, 10, 0.35)"],
      [1, "rgba(230, 110, 10, 0)"],
    ]),
    0.003,
  );
  caustic.position.set(0.3, 0.003, 0.95);
  caustic.scale.set(1.1, 1.5, 1);
  caustic.rotation.z = 0.35;
  scene.add(caustic);

  const world = new Group();
  world.add(createHoneypot());
  scene.add(world);
  const drops = createHoneyDrops(world);

  let dirty = true;
  const resize = () => {
    const width = canvas.clientWidth;
    const height = Math.max(canvas.clientHeight, 1);
    const aspect = width / height;
    const { halfHeight, halfWidth } = framing(aspect);
    const tan = Math.tan((FOV * Math.PI) / 360);
    const distance = Math.max(halfHeight / tan, halfWidth / (tan * aspect));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    camera.aspect = aspect;
    camera.position.set(
      0,
      TARGET.y + distance * Math.sin(ELEVATION),
      distance * Math.cos(ELEVATION),
    );
    camera.lookAt(TARGET);
    camera.updateProjectionMatrix();
    // setSize clears the drawing buffer; draw now rather than show a blank frame.
    renderer.render(scene, camera);
    dirty = true;
  };
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reducedMotion = motionQuery.matches;
  const onMotionChange = (event: MediaQueryListEvent) => {
    reducedMotion = event.matches;
  };
  motionQuery.addEventListener("change", onMotionChange);

  const raycaster = new Raycaster();
  const ground = new Plane(new Vector3(0, 1, 0), 0);
  const projected = new Vector3();

  // The height at which a vertical line through (x, z) leaves the top of the frame.
  const topOfFrame = (x: number, z: number) => {
    let low = 0;
    let high = 12;
    for (let step = 0; step < 20; step += 1) {
      const mid = (low + high) / 2;
      projected.set(x, mid, z).project(camera);
      if (projected.y > 1.05) {
        high = mid;
      } else {
        low = mid;
      }
    }
    return high;
  };

  // Where honey poured at a screen point lands, in the world group's frame.
  const landing = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    raycaster.setFromCamera(
      new Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      ),
      camera,
    );
    const [hit] = raycaster.intersectObject(world, true);
    const point = hit ? hit.point.clone() : raycaster.ray.intersectPlane(ground, new Vector3());
    if (!point) {
      return;
    }
    const local = world.worldToLocal(point);
    const distance = Math.hypot(local.x, local.z);
    if (distance < MOUTH_RADIUS - 0.06) {
      return { intoJar: true, x: local.x, z: local.z } satisfies Aim;
    }
    // Honey that meets the glass runs off it onto the floor at its foot.
    const push = distance < JAR_RADIUS + 0.1 ? (JAR_RADIUS + 0.12) / (distance || 1) : 1;
    return { intoJar: false, x: local.x * push, z: local.z * push } satisfies Aim;
  };

  const sourceHeight = ({ x, z }: Aim) => {
    const from = world.localToWorld(new Vector3(x, 0, z));
    return topOfFrame(from.x, from.z);
  };
  const pourAt = (aim: Aim) => drops.pour(aim.x, aim.z, sourceHeight(aim), aim.intoJar);

  let spin = 0;
  let idleDirection = 1;
  let idleFor = 0;
  let press: Press | undefined;
  let touched = false;

  const radiansPerPixel = () => {
    const distance = camera.position.distanceTo(TARGET);
    const unitsPerPixel =
      (2 * distance * Math.tan((FOV * Math.PI) / 360)) / Math.max(canvas.clientHeight, 1);
    return unitsPerPixel / JAR_RADIUS;
  };

  const endPress = (event: PointerEvent) => {
    if (!press) {
      return;
    }
    const { mode } = press;
    if (mode.kind === "deciding") {
      const aim = landing(press.x, press.y);
      if (aim) {
        pourAt(aim).release();
      }
    } else if (mode.kind === "pouring") {
      mode.pour.release();
    } else {
      const recent = press.samples.filter(
        (sample) => event.timeStamp - sample.t < VELOCITY_WINDOW_MS,
      );
      const [oldest] = recent;
      const newest = recent.at(-1);
      const fresh = newest && event.timeStamp - newest.t < STALE_RELEASE_MS;
      spin =
        oldest && newest && fresh && newest.t > oldest.t
          ? ((newest.x - oldest.x) / ((newest.t - oldest.t) / 1000)) * radiansPerPixel()
          : 0;
      idleDirection = Math.sign(spin) || idleDirection;
    }
    press = undefined;
    idleFor = 0;
  };

  // The browser took the pointer, usually to scroll: leave no honey behind.
  const cancelPress = () => {
    if (press?.mode.kind === "pouring") {
      press.mode.pour.cancel();
    }
    press = undefined;
    idleFor = 0;
  };

  const startPouring = (current: Press) => {
    const aim = landing(current.x, current.y);
    current.mode = aim ? { kind: "pouring", pour: pourAt(aim) } : { kind: "turning" };
  };

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || !event.isPrimary) {
      return;
    }
    canvas.setPointerCapture(event.pointerId);
    press = {
      downAt: event.timeStamp,
      downX: event.clientX,
      downY: event.clientY,
      id: event.pointerId,
      mode: { kind: "deciding" },
      rotationAtGrab: world.rotation.y,
      samples: [{ t: event.timeStamp, x: event.clientX }],
      x: event.clientX,
      y: event.clientY,
    };
    spin = 0;
    idleFor = 0;
    if (!touched) {
      touched = true;
      events.onInteract();
    }
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!press || press.id !== event.pointerId) {
      return;
    }
    press.x = event.clientX;
    press.y = event.clientY;
    press.samples = [
      ...press.samples.filter((sample) => event.timeStamp - sample.t < VELOCITY_WINDOW_MS),
      { t: event.timeStamp, x: event.clientX },
    ];
    const { mode } = press;
    if (mode.kind === "deciding") {
      if (event.timeStamp - press.downAt >= HOLD_MS) {
        startPouring(press);
      } else if (Math.hypot(press.x - press.downX, press.y - press.downY) > TAP_SLOP) {
        press.mode = { kind: "turning" };
      }
    }
    if (mode.kind === "pouring") {
      const aim = landing(press.x, press.y);
      if (aim) {
        mode.pour.steer(aim.x, aim.z, sourceHeight(aim), aim.intoJar);
      }
    } else if (press.mode.kind === "turning") {
      world.rotation.y = press.rotationAtGrab + (press.x - press.downX) * radiansPerPixel();
    }
  };

  const onPointerUp = (event: PointerEvent) => {
    if (press?.id === event.pointerId) {
      endPress(event);
    }
  };
  const onPointerLost = () => cancelPress();

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      spin += event.key === "ArrowLeft" ? -1.5 : 1.5;
      idleDirection = Math.sign(spin) || idleDirection;
      idleFor = 0;
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const angle = Math.random() * Math.PI;
      const distance = 1.35 + Math.random() * 0.6;
      pourAt({
        intoJar: false,
        x: Math.cos(angle) * distance,
        z: Math.sin(angle) * distance,
      }).release();
    }
  };

  const onContextLost = (event: Event) => {
    event.preventDefault();
    renderer.setAnimationLoop(null);
    events.onLost();
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerLost);
  canvas.addEventListener("lostpointercapture", onPointerLost);
  canvas.addEventListener("keydown", onKeyDown);
  canvas.addEventListener("webglcontextlost", onContextLost);

  let elapsed = 0;
  let introIndex = 0;
  let holds: { until: number; pour: Pour }[] = [];
  let last = performance.now();

  const frame = (now: number) => {
    const seconds = Math.min((now - last) / 1000, 1 / 20);
    last = now;
    elapsed += seconds;

    const intro = INTRO[introIndex];
    if (intro && elapsed >= intro.at) {
      holds.push({
        pour: pourAt({ intoJar: false, x: intro.x, z: intro.z }),
        until: elapsed + intro.hold,
      });
      introIndex += 1;
    }
    holds = holds.filter((hold) => {
      if (elapsed < hold.until) {
        return true;
      }
      hold.pour.release();
      return false;
    });

    if (press?.mode.kind === "deciding" && now - press.downAt >= HOLD_MS) {
      startPouring(press);
    }

    let idle = 0;
    if (!press) {
      spin *= Math.exp(-seconds * 3);
      if (Math.abs(spin) < 0.05) {
        idleFor += seconds;
      }
      idle = reducedMotion
        ? 0
        : idleDirection * IDLE_SPIN * Math.min(1, Math.max(0, idleFor - 1.5));
      world.rotation.y += (spin + idle) * seconds;
    }

    drops.update(seconds);
    const moving = press !== undefined || Math.abs(spin) > 1e-3 || idle !== 0 || drops.active();
    if (moving || dirty) {
      renderer.render(scene, camera);
      dirty = false;
    }
  };

  let disposed = false;
  const visibility = new IntersectionObserver(([entry]) => {
    if (entry?.isIntersecting) {
      last = performance.now();
      renderer.setAnimationLoop(frame);
    } else {
      renderer.setAnimationLoop(null);
    }
  });

  // Compile every shader before the first frame, so the reveal doesn't stutter.
  const reveal = async () => {
    await renderer.compileAsync(scene, camera);
    if (disposed) {
      return;
    }
    renderer.render(scene, camera);
    events.onReady();
    visibility.observe(canvas);
  };
  void reveal();

  return () => {
    disposed = true;
    renderer.setAnimationLoop(null);
    visibility.disconnect();
    resizeObserver.disconnect();
    motionQuery.removeEventListener("change", onMotionChange);
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerup", onPointerUp);
    canvas.removeEventListener("pointercancel", onPointerLost);
    canvas.removeEventListener("lostpointercapture", onPointerLost);
    canvas.removeEventListener("keydown", onKeyDown);
    canvas.removeEventListener("webglcontextlost", onContextLost);
    drops.dispose();
    disposeTree(scene);
    scene.environment?.dispose();
    pmrem.dispose();
    renderer.dispose();
  };
};
