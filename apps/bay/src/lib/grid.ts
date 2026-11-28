export type Vec3 = [number, number, number];

export interface Projection {
  anchor: { lat: number; lon: number; height: number };
  azimuth: number;
  tilt: number;
  mpp: number;
}

export interface Grid {
  core: number;
  margin: number;
}

export const SF: Projection = {
  anchor: { height: 0, lat: 37.7955, lon: -122.3937 },
  azimuth: 0,
  mpp: 0.25,
  tilt: 45,
};

export const GRID: Grid = { core: 768, margin: 128 };

export const frameSize = (grid: Grid) => grid.core + grid.margin * 2;

const A = 6_378_137;
const E2 = 6.69437999014e-3;
const rad = (deg: number) => (deg * Math.PI) / 180;

const add: (a: Vec3, b: Vec3) => Vec3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale: (a: Vec3, s: number) => Vec3 = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub: (a: Vec3, b: Vec3) => Vec3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

export const toEcef: (lat: number, lon: number, height: number) => Vec3 = (lat, lon, height) => {
  const p = rad(lat);
  const l = rad(lon);
  const n = A / Math.sqrt(1 - E2 * Math.sin(p) ** 2);

  return [
    (n + height) * Math.cos(p) * Math.cos(l),
    (n + height) * Math.cos(p) * Math.sin(l),
    (n * (1 - E2) + height) * Math.sin(p),
  ];
};

const enu = (lat: number, lon: number) => {
  const p = rad(lat);
  const l = rad(lon);
  const east: Vec3 = [-Math.sin(l), Math.cos(l), 0];
  const north: Vec3 = [-Math.sin(p) * Math.cos(l), -Math.sin(p) * Math.sin(l), Math.cos(p)];
  const up: Vec3 = [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)];

  return { east, north, up };
};

export const toLocal: (proj: Projection, lat: number, lon: number, height: number) => Vec3 = (
  proj,
  lat,
  lon,
  height,
) => {
  const { east, north, up } = enu(proj.anchor.lat, proj.anchor.lon);

  const d = sub(
    toEcef(lat, lon, height),
    toEcef(proj.anchor.lat, proj.anchor.lon, proj.anchor.height),
  );

  return [dot(d, east), dot(d, north), dot(d, up)];
};

export const curvature = (e: number, n: number) => -(e * e + n * n) / (2 * 6_371_000);

export const toLatLon = (proj: Projection, e: number, n: number) => {
  const sin = Math.sin(rad(proj.anchor.lat));
  const meridian = (A * (1 - E2)) / (1 - E2 * sin * sin) ** 1.5;
  const normal = A / Math.sqrt(1 - E2 * sin * sin);

  return {
    lat: proj.anchor.lat + (n / meridian) * (180 / Math.PI),
    lon: proj.anchor.lon + (e / (normal * Math.cos(rad(proj.anchor.lat)))) * (180 / Math.PI),
  };
};

export const basis = (proj: Projection) => {
  const a = rad(proj.azimuth);
  const t = rad(proj.tilt);
  const ahead: Vec3 = [Math.sin(a), Math.cos(a), 0];
  const zUp: Vec3 = [0, 0, 1];

  return {
    ahead,
    look: add(scale(ahead, Math.cos(t)), scale(zUp, -Math.sin(t))),
    right: [Math.cos(a), -Math.sin(a), 0] satisfies Vec3,
    up: add(scale(ahead, Math.sin(t)), scale(zUp, Math.cos(t))),
  };
};

export const localToCanvas = (proj: Projection, p: Vec3) => {
  const b = basis(proj);

  return { x: dot(p, b.right) / proj.mpp, y: -dot(p, b.up) / proj.mpp };
};

export const toCanvas = (proj: Projection, lat: number, lon: number, height: number) =>
  localToCanvas(proj, toLocal(proj, lat, lon, height));

export const groundAt = (proj: Projection, x: number, y: number, z: number) => {
  const b = basis(proj);
  const t = rad(proj.tilt);
  const across = x * proj.mpp;
  const along = (-y * proj.mpp - z * Math.cos(t)) / Math.sin(t);

  return {
    e: b.right[0] * across + b.ahead[0] * along,
    n: b.right[1] * across + b.ahead[1] * along,
  };
};

export const groundBox = (
  proj: Projection,
  rect: { x: number; y: number; w: number; h: number },
  low: number,
  high: number,
) => {
  const corners = [rect.x, rect.x + rect.w].flatMap((x) =>
    [rect.y, rect.y + rect.h].flatMap((y) => [low, high].map((z) => groundAt(proj, x, y, z))),
  );

  return {
    e0: Math.min(...corners.map((c) => c.e)),
    e1: Math.max(...corners.map((c) => c.e)),
    n0: Math.min(...corners.map((c) => c.n)),
    n1: Math.max(...corners.map((c) => c.n)),
  };
};

const STANDOFF = 4000;

export const cameraFor = (
  proj: Projection,
  rect: { x: number; y: number; w: number; h: number },
) => {
  const b = basis(proj);
  const cx = (rect.x + rect.w / 2) * proj.mpp;
  const cy = (rect.y + rect.h / 2) * proj.mpp;
  const center = add(scale(b.right, cx), scale(b.up, -cy));

  return {
    far: STANDOFF * 2,
    halfHeight: (rect.h * proj.mpp) / 2,
    halfWidth: (rect.w * proj.mpp) / 2,
    look: b.look,
    near: 1,
    position: add(center, scale(b.look, -STANDOFF)),
    target: center,
    up: b.up,
  };
};

export const frameRect = (grid: Grid, i: number, j: number) => ({
  h: frameSize(grid),
  w: frameSize(grid),
  x: i * grid.core - grid.margin,
  y: j * grid.core - grid.margin,
});

export const tileKey = (i: number, j: number) => `${i}_${j}`;

export const parseKey = (key: string) => {
  const [i, j] = key.split("_").map(Number);

  if (i === undefined || j === undefined || Number.isNaN(i) || Number.isNaN(j)) {
    throw new Error(`not a tile key: ${key}`);
  }

  return { i, j };
};

export const tileAt = (grid: Grid, x: number, y: number) => ({
  i: Math.floor(x / grid.core),
  j: Math.floor(y / grid.core),
});
