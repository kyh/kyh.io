// The render page: one frame of the map drawn from its Scene (open data, in local metres) through
// the map's camera, in the look of style.ts. pipeline/render.ts opens it in headless Chrome and
// calls window.bay.render for each tile; nothing here is part of the site.

import type { BufferGeometry, Object3D } from "three";
import {
  BoxGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  DoubleSide,
  EdgesGeometry,
  Float32BufferAttribute,
  HemisphereLight,
  IcosahedronGeometry,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Material,
  Matrix4,
  Mesh,
  MeshLambertMaterial,
  OrthographicCamera,
  PCFShadowMap,
  RepeatWrapping,
  SRGBColorSpace,
  Scene,
  // oxlint-disable-next-line anti-slop/no-shape-in-symbol-names -- three's own name for its triangulator
  ShapeUtils,
  Vector2,
  Vector3,
  BufferGeometry as Geometry,
  WebGLRenderer,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Projection } from "../lib/grid";
import { cameraFor } from "../lib/grid";
import type { Building, BuildingLook, Point, Ring, Scene as Frame } from "../lib/scene";
import { area, hash, heightAt, inRing, seeded } from "../lib/scene";
import { AREAS, AREA_ORDER, BUILDINGS, EDGE, GROUND, ROOF_KIT, SUN, TREES, WINDOW } from "./style";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

declare global {
  interface Window {
    bay: {
      setup: (size: number) => void;
      render: (projection: Projection, rect: Rect, frame: Frame) => string;
    };
  }
}

let renderer: WebGLRenderer | null = null;

const setup = (size: number) => {
  renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(size, size);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  document.body.append(renderer.domElement);
};

// ---- the ground: one painted texture over the terrain ------------------------------------------

const MAX_TEXTURE = 8192;

const trace = (ctx: CanvasRenderingContext2D, ring: Ring, at: (p: Point) => [number, number]) => {
  for (const [n, p] of ring.entries()) {
    const [x, y] = at(p);
    if (n === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
};

const ROAD_ORDER = ["path", "rail", "service", "street", "major"] as const;

const paintGround = (frame: Frame) => {
  const { box } = frame;
  const scale = Math.min(4, MAX_TEXTURE / Math.max(box.e1 - box.e0, box.n1 - box.n0));
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil((box.e1 - box.e0) * scale);
  canvas.height = Math.ceil((box.n1 - box.n0) * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("no 2d canvas");
  }
  const at = (p: Point): [number, number] => [(p[0] - box.e0) * scale, (box.n1 - p[1]) * scale];
  ctx.fillStyle = GROUND.land;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const kind of AREA_ORDER) {
    ctx.fillStyle = AREAS[kind];
    // each polygon filled on its own: neighbouring tiles' polygons overlap, and one even-odd fill
    // over both would cut their overlap out
    for (const a of frame.areas.filter((x) => x.kind === kind)) {
      ctx.beginPath();
      for (const ring of a.rings) {
        trace(ctx, ring, at);
      }
      ctx.fill("evenodd");
    }
  }

  const stroke = (line: Point[], color: string, width: number, dash: number[] = []) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width * scale;
    ctx.setLineDash(dash.map((d) => d * scale));
    ctx.beginPath();
    for (const [n, p] of line.entries()) {
      const [x, y] = at(p);
      if (n === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  };
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const roads = ROAD_ORDER.flatMap((k) => frame.roads.filter((r) => r.kind === k));
  // sidewalks under every street, then the carriageways, then their lines, so crossings stay clean
  for (const r of roads) {
    if (r.kind === "street" || r.kind === "major") {
      stroke(r.line, GROUND.sidewalk, r.width + 6);
    }
  }
  for (const r of roads) {
    if (r.kind === "rail") {
      stroke(r.line, GROUND.rail, 1.6);
      stroke(r.line, GROUND.rail, r.width, [0.4, 1.2]);
    } else {
      stroke(r.line, r.kind === "path" ? GROUND.path : GROUND.asphalt, r.width);
    }
  }
  for (const r of roads) {
    if (r.kind === "street" || r.kind === "major") {
      stroke(r.line, GROUND.lane, r.kind === "major" ? 0.5 : 0.35, [3, 4]);
    }
  }
  ctx.setLineDash([]);

  // zebra crossings: bars along the road, a metre apart across it, three metres long
  ctx.fillStyle = GROUND.lane;
  for (const c of frame.crossings) {
    const [x, y] = at([c.e, c.n]);
    ctx.save();
    ctx.translate(x, y);
    // the canvas's y runs south, so the road's angle turns the other way
    ctx.rotate(-c.angle);
    for (let across = -c.width / 2 + 0.75; across < c.width / 2 - 0.5; across += 1) {
      ctx.fillRect(-1.5 * scale, across * scale, 3 * scale, 0.5 * scale);
    }
    ctx.restore();
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
};

const groundMesh = (frame: Frame) => {
  const { box, terrain } = frame;
  const positions: number[] = [];
  const uvs: number[] = [];
  for (let row = 0; row < terrain.rows; row += 1) {
    for (let col = 0; col < terrain.cols; col += 1) {
      const e = terrain.e0 + col * terrain.step;
      const n = terrain.n0 + row * terrain.step;
      positions.push(e, n, terrain.heights[row * terrain.cols + col] ?? 0);
      uvs.push((e - box.e0) / (box.e1 - box.e0), (n - box.n0) / (box.n1 - box.n0));
    }
  }
  const index: number[] = [];
  for (let row = 0; row < terrain.rows - 1; row += 1) {
    for (let col = 0; col < terrain.cols - 1; col += 1) {
      const a = row * terrain.cols + col;
      const b = a + 1;
      const c = a + terrain.cols;
      const d = c + 1;
      index.push(a, b, d, a, d, c);
    }
  }
  const geometry = new Geometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  const mesh = new Mesh(geometry, new MeshLambertMaterial({ map: paintGround(frame) }));
  mesh.receiveShadow = true;
  return mesh;
};

// ---- buildings ----------------------------------------------------------------------------------

// a facade's repeat: one window bay wide, one storey high, metres
const BAY: Record<BuildingLook, { bay: number; floor: number }> = {
  block: { bay: 3.6, floor: 3.4 },
  house: { bay: 3, floor: 3 },
  tower: { bay: 3, floor: 3.8 },
};

// a wall's colour with its windows, one bay by one storey, repeated up and along it
const facade = (look: BuildingLook, wall: string, curtain: boolean) => {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("no 2d canvas");
  }
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, 64, 64);
  if (curtain) {
    // a glass tower: mullions up each bay and a spandrel band at each floor
    ctx.fillStyle = WINDOW.glassTower;
    ctx.globalAlpha = 0.45;
    ctx.fillRect(0, 0, 64, 50);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#d9e2e9";
    ctx.fillRect(0, 0, 3, 64);
    ctx.fillStyle = "#c6d0d8";
    ctx.fillRect(0, 50, 64, 14);
  } else if (look === "house") {
    ctx.fillStyle = WINDOW.trim;
    ctx.fillRect(17, 14, 30, 34);
    ctx.fillStyle = WINDOW.glass;
    ctx.fillRect(20, 17, 24, 28);
  } else {
    ctx.fillStyle = WINDOW.glass;
    ctx.fillRect(13, 12, 38, 32);
    ctx.fillStyle = WINDOW.trim;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(11, 44, 42, 3);
    ctx.globalAlpha = 1;
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
};

// a ring without the closing point GeoJSON repeats
const open = (ring: Ring) => {
  const [first] = ring;
  const last = ring.at(-1);
  return first && last && first[0] === last[0] && first[1] === last[1] ? ring.slice(0, -1) : ring;
};

const wallsOf = (b: Building) => {
  const { bay, floor } = BAY[b.look];
  const positions: number[] = [];
  const uvs: number[] = [];
  for (const ring of b.rings.map(open)) {
    let along = 0;
    for (const [n, a] of ring.entries()) {
      const c = ring[(n + 1) % ring.length];
      const length = c ? Math.hypot(c[0] - a[0], c[1] - a[1]) : 0;
      if (c && length > 0.01) {
        const u0 = along / bay;
        const u1 = (along + length) / bay;
        const v = (b.top - b.base) / floor;
        positions.push(
          a[0],
          a[1],
          b.base,
          c[0],
          c[1],
          b.base,
          c[0],
          c[1],
          b.top,
          a[0],
          a[1],
          b.base,
          c[0],
          c[1],
          b.top,
          a[0],
          a[1],
          b.top,
        );
        uvs.push(u0, 0, u1, 0, u1, v, u0, 0, u1, v, u0, v);
        along += length;
      }
    }
  }
  const geometry = new Geometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
};

// a building's tower as a building of its own, a square shaft up from its roof, and the pyramid
// that caps it at the peak
const towerOf = (b: Building) => {
  const { spire } = b;
  if (!spire) {
    return null;
  }
  const h = spire.side / 2;
  const shoulder = b.top + (spire.top - b.top) * 0.8;
  const square: Ring = [
    [spire.e - h, spire.n - h],
    [spire.e + h, spire.n - h],
    [spire.e + h, spire.n + h],
    [spire.e - h, spire.n + h],
  ];
  const shaft: Building = {
    ...b,
    base: b.top - 1,
    rings: [square],
    spire: undefined,
    top: shoulder,
  };
  const positions: number[] = [];
  for (const [n, a] of square.entries()) {
    const c = square[(n + 1) % square.length] ?? a;
    positions.push(a[0], a[1], shoulder, c[0], c[1], shoulder, spire.e, spire.n, spire.top);
  }
  const cap = new Geometry();
  cap.setAttribute("position", new Float32BufferAttribute(positions, 3));
  cap.setAttribute(
    "uv",
    new Float32BufferAttribute(
      Array.from({ length: 24 }, () => 0),
      2,
    ),
  );
  cap.computeVertexNormals();
  return { cap, shaft };
};

const roofOf = (b: Building) => {
  const [outer = [], ...holes] = b.rings.map(open);
  const contour = outer.map((p) => new Vector2(p[0], p[1]));
  const holePoints = holes.map((h) => h.map((p) => new Vector2(p[0], p[1])));
  const all = [...contour, ...holePoints.flat()];
  const positions: number[] = [];
  // oxlint-disable-next-line anti-slop/no-shape-in-symbol-names -- three's own name for its triangulator
  for (const tri of ShapeUtils.triangulateShape(contour, holePoints)) {
    for (const i of tri) {
      const p = all[i];
      if (p) {
        positions.push(p.x, p.y, b.top);
      }
    }
  }
  const geometry = new Geometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute(
    "uv",
    new Float32BufferAttribute(
      Array.from({ length: (positions.length / 3) * 2 }, () => 0),
      2,
    ),
  );
  geometry.computeVertexNormals();
  return geometry;
};

// the vents, plant and penthouses on a big flat roof
const kitOf = (b: Building) => {
  const [outer] = b.rings;
  const size = outer ? area(outer) : 0;
  if (!outer || b.look === "house" || size < 500) {
    return [];
  }
  const rand = seeded(hash(b.id));
  const es = outer.map((p) => p[0]);
  const ns = outer.map((p) => p[1]);
  const kit: BufferGeometry[] = [];
  for (let tries = 0; tries < 30 && kit.length < Math.min(8, size / 500); tries += 1) {
    const e = Math.min(...es) + rand() * (Math.max(...es) - Math.min(...es));
    const n = Math.min(...ns) + rand() * (Math.max(...ns) - Math.min(...ns));
    if (inRing(outer, e, n)) {
      const h = 1.2 + rand() * 1.4;
      const box = new BoxGeometry(2 + rand() * 3, 2 + rand() * 3, h);
      box.translate(e, n, b.top + h / 2);
      kit.push(box.toNonIndexed());
    }
  }
  return kit;
};

const buildingMeshes = (frame: Frame) => {
  const meshes: Object3D[] = [];
  const groups = new Map<string, Building[]>();
  for (const b of frame.buildings) {
    const key = `${b.look}:${b.tone}`;
    groups.set(key, [...(groups.get(key) ?? []), b]);
  }
  const kit: BufferGeometry[] = [];
  const edges = new LineBasicMaterial({ color: EDGE, opacity: 0.4, transparent: true });
  for (const [key, list] of groups) {
    const [look = "block", tone = "0"] = key.split(":");
    const palette = BUILDINGS[look === "house" || look === "tower" ? look : "block"];
    const t = Number(tone);
    const wall = palette.walls[t] ?? palette.walls[0];
    const roof = palette.roofs[t] ?? palette.roofs[0];
    const curtain = look === "tower" && t !== 4;
    const towers = list.map(towerOf).filter((tower) => tower !== null);
    const walls = mergeGeometries([
      ...list.map(wallsOf),
      ...towers.map((tower) => wallsOf(tower.shaft)),
    ]);
    const roofs = mergeGeometries([...list.map(roofOf), ...towers.map((tower) => tower.cap)]);
    kit.push(...list.flatMap(kitOf));
    const faceMaterial = new MeshLambertMaterial({
      map: facade(look === "house" || look === "tower" ? look : "block", wall, curtain),
      side: DoubleSide,
    });
    const roofMaterial = new MeshLambertMaterial({ color: new Color(roof), side: DoubleSide });
    for (const [geometry, material] of [
      [walls, faceMaterial],
      [roofs, roofMaterial],
    ] as const) {
      const mesh = new Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      meshes.push(mesh, new LineSegments(new EdgesGeometry(geometry, 35), edges));
    }
  }
  if (kit.length > 0) {
    const mesh = new Mesh(mergeGeometries(kit), new MeshLambertMaterial({ color: ROOF_KIT }));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    meshes.push(mesh, new LineSegments(new EdgesGeometry(mesh.geometry, 35), edges));
  }
  return meshes;
};

// ---- trees: round canopies, each a clump of three ----------------------------------------------

const BLOBS = [
  { dx: 0, dy: 0, dz: 0, s: 1 },
  { dx: 0.45, dy: 0.15, dz: -0.25, s: 0.7 },
  { dx: -0.4, dy: -0.25, dz: -0.2, s: 0.66 },
];

const treeMesh = (frame: Frame) => {
  const mesh = new InstancedMesh(
    new IcosahedronGeometry(1, 2),
    new MeshLambertMaterial(),
    frame.trees.length * BLOBS.length,
  );
  const m = new Matrix4();
  const colors = TREES.map((c) => new Color(c));
  for (const [i, tree] of frame.trees.entries()) {
    const ground = heightAt(frame.terrain, tree.e, tree.n);
    const turn =
      seeded(hash(`${Math.round(tree.e * 10)}:${Math.round(tree.n * 10)}`))() * Math.PI * 2;
    for (const [j, blob] of BLOBS.entries()) {
      const dx = (blob.dx * Math.cos(turn) - blob.dy * Math.sin(turn)) * tree.r;
      const dy = (blob.dx * Math.sin(turn) + blob.dy * Math.cos(turn)) * tree.r;
      const r = tree.r * blob.s;
      m.makeScale(r, r, r * 0.9);
      m.setPosition(tree.e + dx, tree.n + dy, ground + 1.5 + tree.r * (0.95 + blob.dz));
      mesh.setMatrixAt(i * BLOBS.length + j, m);
      mesh.setColorAt(i * BLOBS.length + j, colors[(tree.tone + j) % colors.length] ?? new Color());
    }
  }
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
};

// ---- the frame ----------------------------------------------------------------------------------

// where the sun stands: from the south-south-west, about two hours past noon
const SUN_AZIMUTH = 210;
const SUN_ELEVATION = 52;

const render = (projection: Projection, rect: Rect, frame: Frame) => {
  if (!renderer) {
    throw new Error("call setup first");
  }
  const scene = new Scene();
  scene.background = new Color(AREAS.water);
  scene.add(groundMesh(frame), ...buildingMeshes(frame), treeMesh(frame));

  const sky = new HemisphereLight("#ffffff", "#cfc6b6", 1.35);
  sky.position.set(0, 0, 1);
  scene.add(sky);
  const { box } = frame;
  const center = new Vector3((box.e0 + box.e1) / 2, (box.n0 + box.n1) / 2, 0);
  const a = (SUN_AZIMUTH * Math.PI) / 180;
  const el = (SUN_ELEVATION * Math.PI) / 180;
  const sun = new DirectionalLight(SUN, 2.4);
  sun.position
    .copy(center)
    .add(
      new Vector3(
        Math.sin(a) * Math.cos(el),
        Math.cos(a) * Math.cos(el),
        Math.sin(el),
      ).multiplyScalar(2000),
    );
  sun.target.position.copy(center);
  const reach = Math.hypot(box.e1 - box.e0, box.n1 - box.n0) / 2;
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, {
    bottom: -reach,
    far: 4000,
    left: -reach,
    near: 1,
    right: reach,
    top: reach,
  });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.6;
  scene.add(sun, sun.target);

  const cam = cameraFor(projection, rect);
  const camera = new OrthographicCamera(
    -cam.halfWidth,
    cam.halfWidth,
    cam.halfHeight,
    -cam.halfHeight,
    cam.near,
    cam.far,
  );
  camera.position.set(...cam.position);
  camera.up.set(...cam.up);
  camera.lookAt(new Vector3(...cam.target));
  camera.updateProjectionMatrix();

  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL("image/png");

  // let go of everything this frame made: the next one builds its own
  scene.traverse((o) => {
    if (o instanceof Mesh || o instanceof LineSegments) {
      o.geometry.dispose();
      for (const material of [o.material].flat()) {
        if (material instanceof MeshLambertMaterial) {
          material.map?.dispose();
        }
        if (material instanceof Material) {
          material.dispose();
        }
      }
    }
  });
  sun.shadow.dispose();
  return url;
};

window.bay = { render, setup };
