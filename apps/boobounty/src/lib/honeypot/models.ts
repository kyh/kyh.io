import {
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  CustomBlending,
  CylinderGeometry,
  DoubleSide,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  OneFactor,
  OneMinusSrcAlphaFactor,
  Quaternion,
  RepeatWrapping,
  ShaderChunk,
  SphereGeometry,
  SplineCurve,
  SRGBColorSpace,
  TubeGeometry,
  Vector2,
  Vector3,
} from "three";

const LATHE_SEGMENTS = 128;
const GLASS_FLOOR = 0.12;
const LIP_RADIUS = 0.035;
export const HONEY_LEVEL = 1.3;
export const JAR_RADIUS = 1;
export const MOUTH_RADIUS = 0.72;

// Bulb, shoulder, short neck, rolled lip: the classic ribbed honey jar.
const silhouette = new SplineCurve(
  [
    [0.62, 0],
    [0.8, 0.04],
    [0.92, 0.18],
    [0.99, 0.45],
    [1, 0.75],
    [0.97, 1.05],
    [0.88, 1.32],
    [0.78, 1.52],
    [0.74, 1.62],
    [0.74, 1.7],
    [0.79, 1.75],
    [0.8, 1.8],
    [0.78, 1.86],
  ].map(([r = 0, y = 0]) => new Vector2(r, y)),
);

const RIB_START = 0.12;
const RIB_END = 1.45;
const RIB_PITCH = 0.165;
const RIB_DEPTH = 0.022;

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

const rib = (y: number) => {
  const envelope =
    smoothstep(RIB_START, RIB_START + 0.08, y) * (1 - smoothstep(RIB_END - 0.1, RIB_END, y));
  const phase = ((y - RIB_START) / RIB_PITCH) * Math.PI * 2;
  return RIB_DEPTH * envelope * (0.5 - 0.5 * Math.cos(phase));
};

// The glass thickens toward the lip, as pressed jars do.
const wall = (y: number) => 0.045 + 0.015 * smoothstep(1.6, 1.8, y);

const bodyProfile = silhouette.getSpacedPoints(220);

/** The radius a flat label rests at around the jar at height y: on the crests of the ribs. */
export const labelRadiusAt = (y: number) => {
  const above = bodyProfile.findIndex((point) => point.y >= y);
  const a = bodyProfile[Math.max(0, above - 1)];
  const b = bodyProfile[Math.max(0, above)];
  if (!a || !b) {
    return JAR_RADIUS + RIB_DEPTH;
  }
  const t = (y - a.y) / (b.y - a.y || 1);
  return a.x + (b.x - a.x) * t + RIB_DEPTH;
};

const outerProfile = silhouette
  .getSpacedPoints(220)
  .map((point) => new Vector2(point.x + rib(point.y), point.y));

const outerTop = outerProfile.at(-1) ?? new Vector2(0.78, 1.86);
const lipCenter = new Vector2(outerTop.x - wall(outerTop.y) / 2, outerTop.y);
export const LIP_TOP = lipCenter.y + LIP_RADIUS;

/** The jar's outer radius at a height, ribs included. */
export const jarRadiusAt = (y: number) => {
  const above = outerProfile.findIndex((point) => point.y >= y);
  if (above <= 0) {
    return outerProfile[0]?.x ?? 0;
  }
  const a = outerProfile[above - 1];
  const b = outerProfile[above];
  if (!a || !b) {
    return outerTop.x;
  }
  const t = (y - a.y) / (b.y - a.y || 1);
  return a.x + (b.x - a.x) * t;
};

const jarGeometry = () => {
  const inner = outerProfile
    .filter((point) => point.y >= GLASS_FLOOR)
    .map((point) => new Vector2(point.x - wall(point.y), point.y))
    .toReversed();
  const lip = Array.from({ length: 13 }, (_, index) => {
    const angle = (index / 12) * Math.PI;
    return new Vector2(
      lipCenter.x + Math.cos(angle) * LIP_RADIUS,
      lipCenter.y + Math.sin(angle) * LIP_RADIUS,
    );
  });
  const innerFloor = inner.at(-1) ?? new Vector2(0.85, GLASS_FLOOR);
  return new LatheGeometry(
    [
      new Vector2(0, 0),
      ...outerProfile,
      ...lip,
      ...inner,
      new Vector2(innerFloor.x * 0.9, GLASS_FLOOR),
      new Vector2(0, GLASS_FLOOR),
    ],
    LATHE_SEGMENTS,
  );
};

const honeyGeometry = () => {
  const side = outerProfile
    .filter((point) => point.y >= GLASS_FLOOR + 0.004 && point.y <= HONEY_LEVEL)
    .map((point) => new Vector2(point.x - wall(point.y) - 0.004, point.y));
  const edge = side.at(-1) ?? new Vector2(0.85, HONEY_LEVEL);
  // Honey climbs the glass a little, so the surface dips toward the middle.
  return new LatheGeometry(
    [
      new Vector2(0, GLASS_FLOOR + 0.004),
      ...side,
      new Vector2(edge.x - 0.004, HONEY_LEVEL + 0.018),
      new Vector2(edge.x - 0.05, HONEY_LEVEL + 0.002),
      new Vector2(edge.x * 0.5, HONEY_LEVEL - 0.008),
      new Vector2(0, HONEY_LEVEL - 0.01),
    ],
    LATHE_SEGMENTS,
  );
};

/** The grooved head of the dipper, tip at the origin, running up +y. */
const dipperHead = () => {
  const points = [new Vector2(0, 0), new Vector2(0.09, 0.005), new Vector2(0.16, 0.036)];
  for (let ring = 0; ring < 6; ring += 1) {
    const y = 0.06 + ring * 0.102;
    points.push(
      new Vector2(0.142, y),
      new Vector2(0.227, y + 0.017),
      new Vector2(0.232, y + 0.038),
      new Vector2(0.219, y + 0.058),
      new Vector2(0.142, y + 0.072),
    );
  }
  return points;
};

const dipperGeometry = () =>
  new LatheGeometry(
    [
      ...dipperHead(),
      new Vector2(0.1, 0.74),
      new Vector2(0.068, 0.82),
      new Vector2(0.06, 0.92),
      new Vector2(0.062, 2.6),
      new Vector2(0.075, 2.66),
      new Vector2(0.088, 2.74),
      new Vector2(0.08, 2.82),
      new Vector2(0.048, 2.88),
      new Vector2(0, 2.9),
    ],
    64,
  );

// A film of honey over the head, the part lifted out of the jar.
const dipperCoatGeometry = () => {
  const head = dipperHead().map((point) => new Vector2(point.x * 1.03 + 0.006, point.y));
  const top = head.at(-1)?.y ?? 0.7;
  return new LatheGeometry(
    [...head, new Vector2(0.08, top + 0.03), new Vector2(0, top + 0.035)],
    64,
  );
};

/** A tube whose radius follows `radius(t)`, flattened against the glass by `flatten`. */
const ribbon = (
  curve: CatmullRomCurve3,
  radius: (t: number) => number,
  outward: (t: number) => Vector3,
  flatten: number,
) => {
  const tubular = 64;
  const radial = 16;
  const geometry = new TubeGeometry(curve, tubular, 1, radial);
  const position = geometry.getAttribute("position");
  const offset = new Vector3();
  for (let i = 0; i <= tubular; i += 1) {
    const t = i / tubular;
    const center = curve.getPointAt(t);
    const normal = outward(t);
    const r = radius(t);
    for (let j = 0; j <= radial; j += 1) {
      const index = i * (radial + 1) + j;
      offset.fromBufferAttribute(position, index).sub(center).multiplyScalar(r);
      const along = offset.dot(normal);
      offset.addScaledVector(normal, along * (flatten - 1));
      offset.addScaledVector(normal, r * flatten);
      position.setXYZ(index, center.x + offset.x, center.y + offset.y, center.z + offset.z);
    }
  }
  geometry.computeVertexNormals();
  return geometry;
};

/** Honey run over the lip and down the outside of the glass, ending in a bead. */
const drip = (angle: number, length: number, material: MeshPhysicalMaterial) => {
  const top = lipCenter.y;
  const bottom = top - length;
  const out = new Vector3(Math.cos(angle), 0, Math.sin(angle));
  // It hangs straight off the lip until it meets the shoulder, then follows the glass.
  const radiusAt = (y: number) =>
    Math.max(jarRadiusAt(y) - rib(y) + RIB_DEPTH, lipCenter.x + LIP_RADIUS);
  const points = Array.from({ length: 40 }, (_, index) => {
    const y = top - ((top - bottom) * index) / 39;
    return out.clone().multiplyScalar(radiusAt(y)).setY(y);
  });
  const curve = new CatmullRomCurve3(points);
  const group = new Group();
  group.add(
    new Mesh(
      ribbon(
        curve,
        (t) => 0.02 + 0.03 * t ** 3,
        () => out,
        0.45,
      ),
      material,
    ),
  );
  const bead = new Mesh(new SphereGeometry(0.058, 24, 16), material);
  bead.position.copy(curve.getPointAt(1)).addScaledVector(out, 0.03);
  bead.position.y -= 0.02;
  bead.scale.set(0.8, 1.2, 1);
  bead.rotation.y = -angle;
  const smear = new Mesh(new SphereGeometry(0.06, 24, 16), material);
  smear.position
    .copy(out)
    .multiplyScalar(lipCenter.x)
    .setY(LIP_TOP - 0.008);
  smear.rotation.y = -angle;
  smear.scale.set(0.9, 0.5, 1.6);
  group.add(bead, smear);
  return group;
};

const woodTexture = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = "#bd8a55";
    context.fillRect(0, 0, canvas.width, canvas.height);
    for (let line = 0; line < 110; line += 1) {
      const x = Math.random() * canvas.width;
      const width = 0.8 + Math.random() * 4;
      const sway = Math.random() * 6;
      const dark = Math.random() > 0.4;
      context.fillStyle = dark
        ? `rgba(70, 36, 12, ${0.08 + Math.random() * 0.22})`
        : `rgba(220, 170, 110, ${0.05 + Math.random() * 0.12})`;
      for (let y = 0; y < canvas.height; y += 8) {
        context.fillRect(x + Math.sin(y / 40 + line) * sway, y, width, 8);
      }
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(2, 1);
  return texture;
};

/**
 * Honey: refracts what is behind it, darker the more of it light passes through.
 * The light path runs long through the middle and short at the edges, so the
 * thickness follows the view angle and the edges glow while the core goes deep.
 * The roughness floor blurs what is seen through it without dulling highlights.
 */
export const honeyMaterial = (thickness: number) => {
  const material = new MeshPhysicalMaterial({
    attenuationColor: new Color("#d9822b"),
    attenuationDistance: 1.2,
    color: new Color("#ffd38a"),
    ior: 1.49,
    roughness: 0.06,
    specularIntensity: 1,
    thickness,
    transmission: 1,
  });
  material.onBeforeCompile = (shader) => {
    // The chunk is still an #include here, so swap in its source to patch it.
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <transmission_fragment>",
      ShaderChunk.transmission_fragment
        .replace(
          "material.thickness = thickness;",
          `vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
          float chord = max( dot( normal, geometryViewDir ), 0.08 );
          material.thickness = thickness * mix( chord, 0.85, smoothstep( 0.6, 0.9, worldNormal.y ) );`,
        )
        .replace("n, v, material.roughness,", "n, v, max( material.roughness, 0.22 ),"),
    );
  };
  return material;
};

/**
 * Honey spread thin on the floor: a millimetre film whose light path barely
 * changes with the view, so it skips the view-angle thickness and reads as
 * one even amber instead of going cream at the rim.
 */
export const thinHoneyMaterial = () =>
  new MeshPhysicalMaterial({
    attenuationColor: new Color("#bd6510"),
    attenuationDistance: 0.032,
    color: new Color("#ffcf7a"),
    ior: 1.49,
    roughness: 0.04,
    specularIntensity: 1,
    thickness: 0.06,
    transmission: 1,
  });

/**
 * Glass: reflection plus a little absorption that grows along the light path.
 * Three can't refract one transmissive mesh through another; glass and honey
 * share an index of refraction, so the honey carries the refraction and the
 * glass adds only what it reflects (premultiplied) and absorbs.
 */
const glassMaterial = () => {
  const material = new MeshPhysicalMaterial({
    blendDst: OneMinusSrcAlphaFactor,
    blendSrc: OneFactor,
    blending: CustomBlending,
    color: new Color("#000000"),
    depthWrite: false,
    ior: 1.5,
    roughness: 0.03,
    side: DoubleSide,
    transparent: true,
  });
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      `float facing = saturate( abs( dot( normal, geometryViewDir ) ) );
      diffuseColor.a = 1.0 - exp( -0.045 * min( 1.0 / max( facing, 0.05 ), 8.0 ) );
      #include <opaque_fragment>`,
    );
  };
  return material;
};

export const DIPPER_TIP = new Vector3(-0.55, 1.05, -0.1);
export const DIPPER_AXIS = new Vector3(0.8, 0.55, 0.25).normalize();
const DIPPER_LENGTH = 2.9;
// The handle is thinner than a fingertip; grabbing it uses a fatter, unseen stand-in.
const DIPPER_GRIP_RADIUS = 0.3;

/** The jar, its honey, the dipper resting on the rim and a drip under it. */
export const createHoneypot = () => {
  const group = new Group();

  const honey = new Mesh(honeyGeometry(), honeyMaterial(1.9));
  honey.castShadow = true;
  group.add(honey);

  const glass = new Mesh(jarGeometry(), glassMaterial());
  glass.renderOrder = 1;
  group.add(glass);

  const grain = woodTexture();
  const dipper = new Group();
  const wood = new Mesh(
    dipperGeometry(),
    new MeshStandardMaterial({ bumpMap: grain, bumpScale: 0.4, map: grain, roughness: 0.55 }),
  );
  wood.castShadow = true;
  const grip = new Mesh(
    new CylinderGeometry(DIPPER_GRIP_RADIUS, DIPPER_GRIP_RADIUS, DIPPER_LENGTH, 8).translate(
      0,
      DIPPER_LENGTH / 2,
      0,
    ),
    new MeshBasicMaterial({ visible: false }),
  );
  dipper.add(wood, new Mesh(dipperCoatGeometry(), honeyMaterial(0.3)), grip);
  dipper.position.copy(DIPPER_TIP);
  dipper.quaternion.copy(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), DIPPER_AXIS));
  group.add(dipper);

  // Honey runs off where the dipper crosses the rim.
  const rest = DIPPER_TIP.clone().addScaledVector(
    DIPPER_AXIS,
    (LIP_TOP - DIPPER_TIP.y) / DIPPER_AXIS.y,
  );
  group.add(drip(Math.atan2(rest.z, rest.x), 0.55, honeyMaterial(0.4)));

  return { dipper, grip, group };
};
