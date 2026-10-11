// A dithered, flat-shaded icosahedron spinning in true color — inspired by
// real-time ordered-dithering shaders (Bayer-quantised lighting) — rasterised
// onto braille subpixels (2×4 dots per cell, which come out square in ~1:2
// terminal cells). Pure: the pose is a function of time, so a frame is just
// `renderHedron(w, h, ms)`.

// Theme accent (#5EEAD4) as linear channel factors; faces shade from
// near-black through teal, with the top dither level pushed toward white.
const TINT_R = 94 / 255;
const TINT_G = 234 / 255;
const TINT_B = 212 / 255;

// 8×8 Bayer threshold matrix (0..1) — the classic ordered-dither pattern from
// real-time dithering shaders. It stays fixed in screen space while the mesh
// rotates underneath, which is what gives the effect its retro shimmer.
const BAYER8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
].map((row) => row.map((v) => (v + 0.5) / 64));

// Brightness is quantised to this many steps before colorising — few enough
// that the dither pattern is clearly visible inside each face.
const DITHER_LEVELS = 6;

// Icosahedron on the unit sphere: 12 vertices from three golden-ratio
// rectangles, 20 triangular faces.
const PHI = (1 + Math.sqrt(5)) / 2;
const RAW_VERTICES: [number, number, number][] = [
  [-1, PHI, 0],
  [1, PHI, 0],
  [-1, -PHI, 0],
  [1, -PHI, 0],
  [0, -1, PHI],
  [0, 1, PHI],
  [0, -1, -PHI],
  [0, 1, -PHI],
  [PHI, 0, -1],
  [PHI, 0, 1],
  [-PHI, 0, -1],
  [-PHI, 0, 1],
];
const VERTICES: [number, number, number][] = RAW_VERTICES.map(([x, y, z]) => {
  const len = Math.hypot(x, y, z);
  return [x / len, y / len, z / len];
});
const FACES: [number, number, number][] = [
  [0, 11, 5],
  [0, 5, 1],
  [0, 1, 7],
  [0, 7, 10],
  [0, 10, 11],
  [1, 5, 9],
  [5, 11, 4],
  [11, 10, 2],
  [10, 7, 6],
  [7, 1, 8],
  [3, 9, 4],
  [3, 4, 2],
  [3, 2, 6],
  [3, 6, 8],
  [3, 8, 9],
  [4, 9, 5],
  [2, 4, 11],
  [6, 2, 10],
  [8, 6, 7],
  [9, 8, 1],
];

// Point light in view space (unit-mesh coordinates, y up, z toward viewer):
// close upper-left, so flat faces still get a soft gradient across them.
const LIGHT_X = -0.9;
const LIGHT_Y = 1;
const LIGHT_Z = 1.7;

const clamp01 = (v: number) => (v < 0 ? 0 : Math.min(1, v));

// Spin (rad/s) and its fixed tilt.
const SPIN_SPEED = 0.45;
const REST_PITCH = 0.42;

// Braille dot bit values by (row, column) within the 2×4 block.
const BRAILLE_BITS = [
  [0x01, 0x08],
  [0x02, 0x10],
  [0x04, 0x20],
  [0x40, 0x80],
];

const toHex = (v: number) =>
  Math.round(clamp01(v) * 255)
    .toString(16)
    .padStart(2, "0");

// Teal ramp per dither level, with the brightest step lifted toward white so
// specular-lit dither speckles read as highlights.
const LEVEL_COLORS = Array.from({ length: DITHER_LEVELS }, (_, i) => {
  const q = i / (DITHER_LEVELS - 1);
  const lift = q ** 6 * 0.45;
  return `#${toHex(TINT_R * q + lift)}${toHex(TINT_G * q + lift)}${toHex(TINT_B * q + lift)}`;
});

// A vertex after rotation: view-space position + screen position.
type ProjectedVertex = [vx: number, vy: number, vz: number, sx: number, sy: number];

// A run of same-colored cells starting at column `x`; `color` is absent for
// empty background.
export interface Span {
  x: number;
  text: string;
  color?: string;
}

export interface Scanline {
  y: number;
  spans: Span[];
}

// Rotates the mesh by yaw/pitch into view space (y up, z toward viewer) and
// projects it onto the subpixel grid; screen y grows downward.
const project = (
  yaw: number,
  pitch: number,
  radius: number,
  cx: number,
  cy: number,
): ProjectedVertex[] => {
  const cyaw = Math.cos(yaw);
  const syaw = Math.sin(yaw);
  const cpit = Math.cos(pitch);
  const spit = Math.sin(pitch);
  return VERTICES.map(([x0, y0, z0]) => {
    // Ry(yaw)
    const x1 = x0 * cyaw + z0 * syaw;
    const z1 = -x0 * syaw + z0 * cyaw;
    // Rx(pitch)
    const y2 = y0 * cpit - z1 * spit;
    const z2 = y0 * spit + z1 * cpit;
    return [x1, y2, z2, cx + x1 * radius, cy - y2 * radius];
  });
};

// Rasterizes one front-facing triangle: flat face normal, per-pixel point
// light (soft gradient across the face), darkened crease lines along face
// edges so the faceted silhouette stays legible. Stores raw brightness;
// dithering happens per braille dot in emitBraille.
const rasterizeFace = (
  levels: Float64Array,
  pixelW: number,
  pixelH: number,
  p0: ProjectedVertex,
  p1: ProjectedVertex,
  p2: ProjectedVertex,
) => {
  const [ax, ay, az, x0, y0] = p0;
  const [bx, by, bz, x1, y1] = p1;
  const [cx, cy, cz, x2, y2] = p2;
  // outward flat normal from the mesh (vertices are unit, centroid ≈ normal)
  let nx = (ax + bx + cx) / 3;
  let ny = (ay + by + cy) / 3;
  let nz = (az + bz + cz) / 3;
  const nlen = Math.hypot(nx, ny, nz);
  nx /= nlen;
  ny /= nlen;
  nz /= nlen;
  // backface
  if (nz <= 0) {
    return;
  }

  const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
  if (Math.abs(area) < 1e-6) {
    return;
  }

  const minX = Math.max(0, Math.floor(Math.min(x0, x1, x2)));
  const maxX = Math.min(pixelW - 1, Math.ceil(Math.max(x0, x1, x2)));
  const minY = Math.max(0, Math.floor(Math.min(y0, y1, y2)));
  const maxY = Math.min(pixelH - 1, Math.ceil(Math.max(y0, y1, y2)));

  for (let py = minY; py <= maxY; py += 1) {
    for (let px = minX; px <= maxX; px += 1) {
      const x = px + 0.5;
      const y = py + 0.5;
      const w0 = ((x1 - x) * (y2 - y) - (x2 - x) * (y1 - y)) / area;
      const w1 = ((x2 - x) * (y0 - y) - (x0 - x) * (y2 - y)) / area;
      const w2 = 1 - w0 - w1;
      if (w0 < 0 || w1 < 0 || w2 < 0) {
        continue;
      }

      // surface point in view space for the point-light gradient
      const spx = w0 * ax + w1 * bx + w2 * cx;
      const spy = w0 * ay + w1 * by + w2 * cy;
      const spz = w0 * az + w1 * bz + w2 * cz;
      const ldx = LIGHT_X - spx;
      const ldy = LIGHT_Y - spy;
      const ldz = LIGHT_Z - spz;
      const dist = Math.hypot(ldx, ldy, ldz);
      const diffuse = Math.max(0, (nx * ldx + ny * ldy + nz * ldz) / dist);
      const atten = 1 / (0.55 + 0.22 * dist * dist);
      // Blinn specular against the view direction (0, 0, 1)
      const hlen = Math.hypot(ldx, ldy, ldz + dist);
      const spec = Math.max(0, (nx * ldx + ny * ldy + nz * (ldz + dist)) / hlen) ** 20;

      // gentle gain: lit faces stay below full saturation so the dither
      // texture remains visible instead of collapsing into solid dots
      let light = 0.18 + diffuse * atten * 1 + spec * 0.38;

      // darken along triangle edges — the crease lines are what make the
      // individual facets (and thus the polyhedron) legible at this size
      const edge = Math.min(w0, w1, w2);
      if (edge < 0.05) {
        light *= 0.1 + (edge / 0.05) * 0.9;
      }

      levels[py * pixelW + px] = clamp01(light);
    }
  }
};

// Packs a 2×4 subpixel block into a braille glyph: a dot turns on when its
// brightness beats the Bayer threshold at that screen position (ordered
// dithering — brightness becomes dot density), and the cell's color is the
// quantised average brightness on the teal ramp. Null for an empty cell.
const brailleCell = (
  levels: Float64Array,
  pixelW: number,
  cellX: number,
  cellY: number,
): Omit<Span, "x"> | null => {
  let dots = 0;
  let sum = 0;
  let covered = 0;
  let minThreshold = 1;
  let minThresholdBit = 0;
  for (let dy = 0; dy < 4; dy += 1) {
    for (let dx = 0; dx < 2; dx += 1) {
      const px = cellX * 2 + dx;
      const py = cellY * 4 + dy;
      const light = levels[py * pixelW + px] ?? -1;
      if (light < 0) {
        continue;
      }
      covered += 1;
      sum += light;
      const bit = BRAILLE_BITS[dy]?.[dx] ?? 0;
      const threshold = BAYER8[py % 8]?.[px % 8] ?? 0.5;
      if (light > threshold) {
        // oxlint-disable-next-line no-bitwise -- a braille glyph is a bitmask of its 8 dots
        dots |= bit;
      }
      if (threshold < minThreshold) {
        minThreshold = threshold;
        minThresholdBit = bit;
      }
    }
  }
  if (covered === 0) {
    return null;
  }
  // a well-covered cell with zero dots punches a hole in the shape — keep the
  // single most-likely dot instead
  if (dots === 0 && covered >= 4) {
    dots = minThresholdBit;
  }
  if (dots === 0) {
    return null;
  }
  const level = Math.max(1, Math.round((sum / covered) * (DITHER_LEVELS - 1)));
  return { color: LEVEL_COLORS[level], text: String.fromCodePoint(0x28_00 + dots) };
};

// One frame as scanlines of color runs, `w`×`h` cells, at `ms` into the spin.
export const renderHedron = (w: number, h: number, ms: number): Scanline[] => {
  const pixelW = w * 2;
  const pixelH = h * 4;
  const radius = Math.min(pixelW, pixelH) / 2 - 1;
  if (radius <= 4) {
    return [];
  }
  const levels = new Float64Array(pixelW * pixelH).fill(-1);
  const vertices = project((SPIN_SPEED * ms) / 1000, REST_PITCH, radius, pixelW / 2, pixelH / 2);
  for (const [a, b, c] of FACES) {
    const p0 = vertices[a];
    const p1 = vertices[b];
    const p2 = vertices[c];
    if (p0 && p1 && p2) {
      rasterizeFace(levels, pixelW, pixelH, p0, p1, p2);
    }
  }

  const rows: Scanline[] = [];
  for (let cellY = 0; cellY < h; cellY += 1) {
    const spans: Span[] = [];
    for (let cellX = 0; cellX < w; cellX += 1) {
      const cell = brailleCell(levels, pixelW, cellX, cellY) ?? { text: " " };
      const last = spans.at(-1);
      if (last && last.color === cell.color) {
        last.text += cell.text;
      } else {
        spans.push({ ...cell, x: cellX });
      }
    }
    rows.push({ spans, y: cellY });
  }
  return rows;
};
