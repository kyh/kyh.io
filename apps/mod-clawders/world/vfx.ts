// Particles: gold sparkles where a coin is taken, dust where Clawd lands and
// runs, stars where it crashes, and wind streaks rushing past. Each kind is
// one pooled THREE.Points cloud, its positions rewritten every frame.
import * as THREE from "three";

interface Particle {
  life: number;
  age: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
}

interface CloudOptions {
  count: number;
  size: number;
  blending: THREE.Blending;
  gravity: number;
  drag: number;
  texture: THREE.Texture;
}

// A soft round dot, or a four-point twinkle.
const sprite = (isStar: boolean) => {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const glow = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    glow.addColorStop(0, "rgba(255,255,255,1)");
    glow.addColorStop(isStar ? 0.15 : 0.45, "rgba(255,255,255,0.75)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 64, 64);
    if (isStar) {
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      for (const [x, y] of [
        [32, 0],
        [36, 28],
        [64, 32],
        [36, 36],
        [32, 64],
        [28, 36],
        [0, 32],
        [28, 28],
      ]) {
        ctx.lineTo(x ?? 0, y ?? 0);
      }
      ctx.fill();
    }
  }
  return new THREE.CanvasTexture(canvas);
};

// Round sprites sized in world units, each with its own color, fade and
// growth; PointsMaterial has no per-point alpha, which dust needs to thin
// out rather than darken.
const cloudMaterial = (options: CloudOptions) =>
  new THREE.ShaderMaterial({
    blending: options.blending,
    depthWrite: false,
    fragmentShader: `
      uniform sampler2D map;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float a = texture2D(map, gl_PointCoord).a * vAlpha;
        if (a < 0.01) discard;
        gl_FragColor = vec4(vColor, a);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    uniforms: {
      map: { value: options.texture },
      pixelsPerUnit: { value: 300 },
      size: { value: options.size },
    },
    vertexShader: `
      uniform float size;
      uniform float pixelsPerUnit;
      attribute vec3 color;
      attribute float alpha;
      attribute float grow;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vColor = color;
        vAlpha = alpha;
        vec4 view = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * grow * pixelsPerUnit / max(0.1, -view.z);
        gl_Position = projectionMatrix * view;
      }`,
  });

const createCloud = (scene: THREE.Scene, options: CloudOptions & { growth: number }) => {
  const positions = new Float32Array(options.count * 3);
  const colors = new Float32Array(options.count * 3);
  const alphas = new Float32Array(options.count);
  const grows = new Float32Array(options.count);
  const attributes = {
    alpha: new THREE.BufferAttribute(alphas, 1),
    color: new THREE.BufferAttribute(colors, 3),
    grow: new THREE.BufferAttribute(grows, 1),
    position: new THREE.BufferAttribute(positions, 3),
  };
  const geometry = new THREE.BufferGeometry();
  for (const [name, attribute] of Object.entries(attributes)) {
    geometry.setAttribute(name, attribute);
  }
  const material = cloudMaterial(options);
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);
  const live: Particle[] = [];

  const emit = (particle: Omit<Particle, "age">) => {
    if (live.length >= options.count) {
      live.shift();
    }
    live.push({ ...particle, age: 0 });
  };

  // `drift` moves everything toward the camera with the world.
  const update = (dt: number, drift: number) => {
    for (let i = live.length - 1; i >= 0; i -= 1) {
      const p = live[i];
      if (!p) {
        continue;
      }
      p.age += dt;
      if (p.age >= p.life) {
        live.splice(i, 1);
        continue;
      }
      p.velocity.y -= options.gravity * dt;
      p.velocity.multiplyScalar(Math.max(0, 1 - options.drag * dt));
      p.position.addScaledVector(p.velocity, dt);
      p.position.z += drift;
    }
    for (let i = 0; i < options.count; i += 1) {
      const p = live[i];
      const t = p ? p.age / p.life : 1;
      positions.set(p ? [p.position.x, p.position.y, p.position.z] : [0, -100, 0], i * 3);
      colors.set(p ? [p.color.r, p.color.g, p.color.b] : [0, 0, 0], i * 3);
      alphas[i] = p ? 1 - t * t : 0;
      grows[i] = 1 + t * options.growth;
    }
    for (const attribute of Object.values(attributes)) {
      attribute.needsUpdate = true;
    }
  };

  const scale = (pixelsPerUnit: number, boost: number) => {
    material.uniforms.pixelsPerUnit = { value: pixelsPerUnit };
    material.uniforms.size = { value: options.size * boost };
  };

  return { emit, points, scale, update };
};

const GOLD = [
  new THREE.Color(0xff_d2_3a),
  new THREE.Color(0xff_f4_b0),
  new THREE.Color(0xff_ff_ff),
];
const DUST = new THREE.Color(0x8a_76_66);
const IMPACT = [
  new THREE.Color(0xff_ff_ff),
  new THREE.Color(0xff_c4_3a),
  new THREE.Color(0xff_6a_3a),
];

const pick = <T>(items: readonly T[], fallback: T) =>
  items[Math.floor(Math.random() * items.length)] ?? fallback;

const around = (spread: number) => (Math.random() - 0.5) * spread;

export const createVfx = (scene: THREE.Scene) => {
  const star = sprite(true);
  const dot = sprite(false);
  const sparkles = createCloud(scene, {
    blending: THREE.AdditiveBlending,
    count: 240,
    drag: 2.5,
    gravity: 3,
    growth: -0.5,
    size: 0.45,
    texture: star,
  });
  // Dust darkens the ground it rises from; additive would only brighten it.
  const dust = createCloud(scene, {
    blending: THREE.NormalBlending,
    count: 200,
    drag: 3,
    gravity: -0.6,
    growth: 1.5,
    size: 0.9,
    texture: dot,
  });
  const streaks = createCloud(scene, {
    blending: THREE.AdditiveBlending,
    count: 90,
    drag: 0,
    gravity: 0,
    growth: 0,
    size: 0.35,
    texture: dot,
  });
  let isCoarse = false;

  const coin = (at: THREE.Vector3) => {
    for (let i = 0; i < 22; i += 1) {
      const angle = (i / 22) * Math.PI * 2;
      const speed = 3 + Math.random() * 3;
      sparkles.emit({
        color: pick(GOLD, new THREE.Color(0xff_ff_ff)),
        life: 0.45 + Math.random() * 0.3,
        position: at.clone(),
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          2 + Math.sin(angle) * speed,
          around(2),
        ),
      });
    }
  };

  const puff = (at: THREE.Vector3, amount: number, spread: number) => {
    for (let i = 0; i < amount; i += 1) {
      dust.emit({
        color: DUST.clone().offsetHSL(0, 0, around(0.1)),
        life: 0.5 + Math.random() * 0.4,
        position: at.clone().add(new THREE.Vector3(around(spread), 0.1, around(0.4))),
        velocity: new THREE.Vector3(around(3) * spread, 0.6 + Math.random(), 1 + Math.random()),
      });
    }
  };

  const crash = (at: THREE.Vector3) => {
    for (let i = 0; i < 36; i += 1) {
      const direction = new THREE.Vector3(around(2), Math.random() * 1.2, around(2)).normalize();
      sparkles.emit({
        color: pick(IMPACT, new THREE.Color(0xff_ff_ff)),
        life: 0.5 + Math.random() * 0.4,
        position: at.clone(),
        velocity: direction.multiplyScalar(6 + Math.random() * 6),
      });
    }
    puff(at.clone().setY(0.2), 14, 1.6);
  };

  // Wind past the camera, faster as the run speeds up; pictures only, since
  // in blocks a streak is a stray pixel.
  const wind = (camera: THREE.Camera, speed: number, dt: number) => {
    if (isCoarse || Math.random() > speed * dt * 0.5) {
      return;
    }
    const side = Math.random() < 0.5 ? -1 : 1;
    streaks.emit({
      color: new THREE.Color(0xff_ff_ff).multiplyScalar(0.6),
      life: 0.35,
      position: new THREE.Vector3(
        camera.position.x + side * (2.5 + Math.random() * 4),
        camera.position.y - 1 + Math.random() * 3,
        camera.position.z - 30,
      ),
      velocity: new THREE.Vector3(0, 0, speed * 3),
    });
  };

  let pixelsPerUnit = 300;
  // In two-pixel blocks sparkles need a little more size to register, and
  // dust less, or it fogs the whole lane.
  const sizeAll = () => {
    sparkles.scale(pixelsPerUnit, isCoarse ? 1.15 : 1);
    dust.scale(pixelsPerUnit, isCoarse ? 0.9 : 1);
    streaks.scale(pixelsPerUnit, 1);
  };

  const setCoarse = (coarse: boolean) => {
    isCoarse = coarse;
    streaks.points.visible = !coarse;
    sizeAll();
  };

  // Point sizes are in pixels: a world unit's pixels at unit distance.
  const resize = (height: number, fov: number) => {
    pixelsPerUnit = height / (2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2));
    sizeAll();
  };

  const update = (dt: number, drift: number) => {
    sparkles.update(dt, drift);
    dust.update(dt, drift);
    streaks.update(dt, 0);
  };

  return { coin, crash, puff, resize, setCoarse, update, wind };
};
