import type { Material, Object3D } from "three";
import {
  BackSide,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  DataTexture,
  DirectionalLight,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  NeutralToneMapping,
  PCFShadowMap,
  PerspectiveCamera,
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

import { createDipper } from "./dipper";
import { createHalftone } from "./halftone";
import { createHoneyDrops } from "./honey-drops";
import { JAR_RADIUS, createHoneypot } from "./models";
import { createSticker } from "./sticker";

const BACKGROUND = "#fcf3cf";
// The middle of the jar's body, so the jar sits at the center of the frame.
const TARGET = new Vector3(0, 1, 0);
const FOV = 28;
const ELEVATION = 0.44;
// Left alone, the jar sways around its front, label to the viewer, then settles.
const SWAY = { after: 1.5, amplitude: 0.32, fade: 3, period: 9, rate: 1.4, seconds: 12 };
// A touch held this still this long on the dipper picks it up instead of scrolling.
const TOUCH_HOLD_MS = 160;
const VELOCITY_WINDOW_MS = 80;
const STALE_RELEASE_MS = 40;

// Framing in world units around TARGET: tight like a product shot, with room
// above for the carried dipper and around for its drizzle.
const framing = (aspect: number) =>
  aspect < 1 ? { halfHeight: 2.6, halfWidth: 2.3 } : { halfHeight: 2.45, halfWidth: 2.6 };

// The dipper lifts and drizzles a curve on its own once, to show what it does.
const DEMO = { duration: 2.2, start: 0.9 };
const DEMO_PATH = new CatmullRomCurve3([
  new Vector3(0.95, 0, 0.6),
  new Vector3(1.55, 0, 0.75),
  new Vector3(1.6, 0, 1.3),
  new Vector3(1.05, 0, 1.55),
  new Vector3(0.45, 0, 1.75),
]);

export interface HoneypotEvents {
  /** The first frame is on screen. */
  onReady: () => void;
  /** The GPU dropped the context; the canvas is dead. */
  onLost: () => void;
  /** Someone picked the dipper up, or put it down. */
  onCarry: (held: boolean) => void;
}

// A softbox's light falls off toward its edges; a hard-edged panel stamps a
// crisp white dash on every rib of the jar.
const falloff = (t: number) => Math.sin(Math.PI * t) ** 1.5;

const softboxTexture = () => {
  const width = 64;
  const height = 128;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = Math.round(255 * falloff((x + 0.5) / width) * falloff((y + 0.5) / height));
      data.set([value, value, value, 255], (y * width + x) * 4);
    }
  }
  const texture = new DataTexture(data, width, height);
  texture.needsUpdate = true;
  return texture;
};

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
    { at: [0, 8, 0], intensity: 6, size: [7, 7] },
    { at: [-6, 2.5, 2.5], intensity: 6, size: [3, 8] },
    { at: [6, 2.5, 1.5], intensity: 4.5, size: [2.6, 8] },
    { at: [0, 2, -7], color: "#ffe2b8", intensity: 3, size: [6, 4] },
    { at: [0, -0.05, 0], intensity: 1.8, size: [12, 12] },
  ];
  const softbox = softboxTexture();
  for (const { at, color = "#ffffff", intensity, size } of lights) {
    const [w = 1, h = 1] = size;
    const [x = 0, y = 0, z = 0] = at;
    const panel = new Mesh(
      new PlaneGeometry(w, h),
      new MeshBasicMaterial({
        color: new Color(color).multiplyScalar(intensity),
        map: softbox,
        side: DoubleSide,
      }),
    );
    panel.position.set(x, y, z);
    panel.lookAt(0, 1, 0);
    room.add(panel);
  }
  return { room, softbox };
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
  downX: number;
  downY: number;
  rotationAtGrab: number;
  samples: { t: number; x: number }[];
  /** Where the dipper was picked up, in the scene's frame; absent while turning. */
  carryFrom: Vector3 | undefined;
}

/**
 * Mounts the honeypot on a canvas: dragging the dipper carries it and drizzles
 * honey, dragging anything else turns the jar. Throws when WebGL is
 * unavailable. Returns its teardown.
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
  const { room, softbox } = studio();
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  disposeTree(room);
  softbox.dispose();
  scene.environmentIntensity = 0.9;

  const camera = new PerspectiveCamera(FOV, 1, 0.1, 100);
  const print = createHalftone(renderer, BACKGROUND);

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
  const honeypot = createHoneypot();
  world.add(honeypot.group);
  scene.add(world);
  const drops = createHoneyDrops(world);
  const dipper = createDipper({ dipper: honeypot.dipper, drops });
  const sticker = createSticker();
  world.add(sticker.mesh);

  let dirty = true;
  const resize = () => {
    const width = canvas.clientWidth;
    const height = Math.max(canvas.clientHeight, 1);
    const aspect = width / height;
    const { halfHeight, halfWidth } = framing(aspect);
    const tan = Math.tan((FOV * Math.PI) / 360);
    const distance = Math.max(halfHeight / tan, halfWidth / (tan * aspect));
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    print.setSize(width, height, pixelRatio);
    camera.aspect = aspect;
    camera.position.set(
      0,
      TARGET.y + distance * Math.sin(ELEVATION),
      distance * Math.cos(ELEVATION),
    );
    camera.lookAt(TARGET);
    camera.updateProjectionMatrix();
    // setSize clears the drawing buffer; draw now rather than show a blank frame.
    print.render(scene, camera);
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

  const aimRay = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    raycaster.setFromCamera(
      new Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      ),
      camera,
    );
  };

  const onDipper = (clientX: number, clientY: number) => {
    aimRay(clientX, clientY);
    return raycaster.intersectObject(honeypot.grip).length > 0;
  };

  let spin = 0;
  let idleFor = 0;
  let press: Press | undefined;
  // Waits until the picture is properly in view; skipped for reduced motion.
  let demo: number | undefined;
  let demoPending = true;
  let touchedAt: number | undefined;

  const unitsPerPixel = () =>
    (2 * camera.position.distanceTo(TARGET) * Math.tan((FOV * Math.PI) / 360)) /
    Math.max(canvas.clientHeight, 1);
  const radiansPerPixel = () => unitsPerPixel() / JAR_RADIUS;

  // A drag moves the dipper over the floor as far as it moves on screen: across
  // the screen is across the floor, down the screen is toward the viewer,
  // stretched by the floor's foreshortening.
  const carryTo = (from: Vector3, dx: number, dy: number) => {
    const units = unitsPerPixel();
    return world.worldToLocal(
      new Vector3(from.x + dx * units, 0, from.z + (dy * units) / Math.sin(ELEVATION)),
    );
  };

  const stopDemo = () => {
    if (demo !== undefined && demo < 0) {
      dipper.drop();
    }
    demo = undefined;
    demoPending = false;
  };

  const endPress = (event?: PointerEvent) => {
    if (!press) {
      return;
    }
    if (press.carryFrom) {
      dipper.drop();
      events.onCarry(false);
    } else if (event) {
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
    }
    press = undefined;
    idleFor = 0;
  };

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || !event.isPrimary) {
      return;
    }
    canvas.setPointerCapture(event.pointerId);
    stopDemo();
    const carryFrom = onDipper(event.clientX, event.clientY)
      ? world.localToWorld(dipper.tip())
      : undefined;
    if (carryFrom) {
      const point = carryTo(carryFrom, 0, 0);
      dipper.lift(point.x, point.z);
      dipper.hover(false);
      events.onCarry(true);
    }
    press = {
      carryFrom,
      downX: event.clientX,
      downY: event.clientY,
      id: event.pointerId,
      rotationAtGrab: world.rotation.y,
      samples: [{ t: event.timeStamp, x: event.clientX }],
    };
    spin = 0;
    idleFor = 0;
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!press && event.pointerType === "mouse") {
      dipper.hover(onDipper(event.clientX, event.clientY));
      return;
    }
    if (!press || press.id !== event.pointerId) {
      return;
    }
    if (press.carryFrom) {
      const point = carryTo(
        press.carryFrom,
        event.clientX - press.downX,
        event.clientY - press.downY,
      );
      dipper.moveTo(point.x, point.z);
      return;
    }
    press.samples = [
      ...press.samples.filter((sample) => event.timeStamp - sample.t < VELOCITY_WINDOW_MS),
      { t: event.timeStamp, x: event.clientX },
    ];
    world.rotation.y = press.rotationAtGrab + (event.clientX - press.downX) * radiansPerPixel();
  };

  const onPointerUp = (event: PointerEvent) => {
    if (press?.id === event.pointerId) {
      endPress(event);
    }
  };
  const onPointerLost = () => endPress();
  const onPointerLeave = () => dipper.hover(false);

  // A swipe that starts on the dipper still scrolls the page; a touch held on
  // it first carries it, and from then on the page stays put.
  const onTouchStart = (event: TouchEvent) => {
    const [touch] = event.touches;
    touchedAt =
      touch && event.touches.length === 1 && onDipper(touch.clientX, touch.clientY)
        ? event.timeStamp
        : undefined;
  };
  const onTouchMove = (event: TouchEvent) => {
    if (touchedAt !== undefined && event.timeStamp - touchedAt >= TOUCH_HOLD_MS) {
      event.preventDefault();
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      spin += event.key === "ArrowLeft" ? -1.5 : 1.5;
      idleFor = 0;
    } else if ((event.key === "Enter" || event.key === " ") && !dipper.held()) {
      event.preventDefault();
      demo = 0;
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
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("touchstart", onTouchStart, { passive: true });
  canvas.addEventListener("touchmove", onTouchMove, { passive: false });
  canvas.addEventListener("keydown", onKeyDown);
  canvas.addEventListener("webglcontextlost", onContextLost);

  let last = performance.now();

  // `demo` counts down to the drizzle; past zero it is how long the drizzle has run.
  const stepDemo = (seconds: number) => {
    if (demo === undefined) {
      return;
    }
    demo -= seconds;
    if (demo > 0) {
      return;
    }
    const t = -demo / DEMO.duration;
    if (t >= 1) {
      dipper.drop();
      demo = undefined;
      return;
    }
    const point = DEMO_PATH.getPoint(t);
    if (dipper.held()) {
      dipper.moveTo(point.x, point.z);
    } else {
      dipper.lift(point.x, point.z);
    }
  };

  const frame = (now: number) => {
    const seconds = Math.min((now - last) / 1000, 1 / 20);
    last = now;

    stepDemo(seconds);

    let swaying = false;
    if (!press) {
      spin *= Math.exp(-seconds * 3);
      world.rotation.y += spin * seconds;
      if (Math.abs(spin) < 0.05) {
        idleFor += seconds;
      }
      const t = idleFor - SWAY.after;
      if (!reducedMotion && t > 0 && t < SWAY.seconds + SWAY.fade + 4) {
        const ramp =
          Math.min(1, t) * Math.min(1, Math.max(0, (SWAY.seconds + SWAY.fade - t) / SWAY.fade));
        const front = Math.round(world.rotation.y / (Math.PI * 2)) * Math.PI * 2;
        const goal = front + SWAY.amplitude * ramp * Math.sin((Math.PI * 2 * t) / SWAY.period);
        world.rotation.y += (goal - world.rotation.y) * (1 - Math.exp(-SWAY.rate * seconds));
        swaying = Math.abs(goal - world.rotation.y) > 1e-4 || ramp > 0;
      }
    }

    const carried = dipper.update(seconds, world.rotation.y);
    drops.update(seconds);
    const moving =
      press !== undefined ||
      demo !== undefined ||
      carried ||
      Math.abs(spin) > 1e-3 ||
      swaying ||
      drops.active();
    if (moving || dirty) {
      print.render(scene, camera);
      dirty = false;
    }
  };

  let disposed = false;
  const visibility = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting) {
        last = performance.now();
        renderer.setAnimationLoop(frame);
      } else {
        renderer.setAnimationLoop(null);
      }
      if (demoPending && !reducedMotion && entry && entry.intersectionRatio >= 0.6) {
        demoPending = false;
        demo = DEMO.start;
      }
    },
    { threshold: [0, 0.6] },
  );

  // Compile every shader before the first frame, so the reveal doesn't stutter.
  const reveal = async () => {
    await sticker.ready();
    await print.compile(scene, camera);
    if (disposed) {
      return;
    }
    print.render(scene, camera);
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
    canvas.removeEventListener("pointerleave", onPointerLeave);
    canvas.removeEventListener("touchstart", onTouchStart);
    canvas.removeEventListener("touchmove", onTouchMove);
    canvas.removeEventListener("keydown", onKeyDown);
    canvas.removeEventListener("webglcontextlost", onContextLost);
    drops.dispose();
    print.dispose();
    disposeTree(scene);
    scene.environment?.dispose();
    pmrem.dispose();
    renderer.dispose();
  };
};
