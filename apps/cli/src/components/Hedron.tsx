import {
  Renderable,
  RGBA,
  type OptimizedBuffer,
  type RenderContext,
  type RenderableOptions,
} from "@opentui/core";
import { extend } from "@opentui/react";

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
const FACES = [
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
const LIGHT_Y = 1.0;
const LIGHT_Z = 1.7;

const TRANSPARENT = RGBA.fromValues(0, 0, 0, 0);

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
// keep the tilt away from gimbal-flip territory
const clampPitch = (v: number) => (v < -1.35 ? -1.35 : v > 1.35 ? 1.35 : v);
// cap thrown momentum to something that still reads as a shape
const clampVel = (v: number) => (v < -6 ? -6 : v > 6 ? 6 : v);

// Baseline auto-spin (rad/s) and its resting tilt.
const SPIN_SPEED = 0.45;
const REST_PITCH = 0.42;
// Drag sensitivity: radians per terminal cell moved. Cells are ~2:1, so
// vertical drags get double weight to feel isotropic.
const DRAG_YAW = 0.09;
const DRAG_PITCH = 0.18;

// A dithered, flat-shaded icosahedron spinning in true color — inspired by
// real-time ordered-dithering shaders (Bayer-quantised lighting) — drawn into
// the framebuffer with half-block pixels (▀ fg = upper, bg = lower) for
// square-pixel geometry. `live` opts it into the continuous render loop; it
// advances its own clock from deltaTime, no React re-renders involved.
// Drag it with the mouse to throw it around; released momentum decays back
// into the idle auto-spin.
export class HedronRenderable extends Renderable {
  // per-pixel quantised brightness for the current frame; -1 = background
  private levels = new Float64Array(0);

  private yaw = 0;
  private pitch = REST_PITCH;
  private yawVel = SPIN_SPEED;
  private pitchVel = 0;
  private dragging = false;
  private lastDragX = 0;
  private lastDragY = 0;
  private lastDragAt = 0;

  constructor(ctx: RenderContext, options: RenderableOptions) {
    super(ctx, { ...options, live: true });

    this.onMouseDown = (event) => {
      this.dragging = true;
      this.lastDragX = event.x;
      this.lastDragY = event.y;
      this.lastDragAt = performance.now();
      this.yawVel = 0;
      this.pitchVel = 0;
    };
    this.onMouseDrag = (event) => {
      if (!this.dragging) return;
      const dx = event.x - this.lastDragX;
      const dy = event.y - this.lastDragY;
      const now = performance.now();
      const dt = Math.max(16, now - this.lastDragAt) / 1000;
      this.lastDragX = event.x;
      this.lastDragY = event.y;
      this.lastDragAt = now;

      this.yaw += dx * DRAG_YAW;
      this.pitch = clampPitch(this.pitch + dy * DRAG_PITCH);
      // instantaneous velocity → momentum on release
      this.yawVel = clampVel((dx * DRAG_YAW) / dt);
      this.pitchVel = clampVel((dy * DRAG_PITCH) / dt);
    };
    const release = () => {
      this.dragging = false;
    };
    this.onMouseUp = release;
    this.onMouseDragEnd = release;
  }

  protected renderSelf(buffer: OptimizedBuffer, deltaTime: number): void {
    const dt = Math.min(0.1, deltaTime / 1000);
    if (!this.dragging) {
      this.yaw += this.yawVel * dt;
      this.pitch = clampPitch(this.pitch + this.pitchVel * dt);
      // momentum bleeds off toward the idle state: baseline yaw spin,
      // resting tilt, no pitch drift
      const relax = Math.min(1, dt * 0.9);
      this.yawVel += (SPIN_SPEED - this.yawVel) * relax;
      this.pitchVel -= this.pitchVel * Math.min(1, dt * 2.2);
      this.pitch += (REST_PITCH - this.pitch) * Math.min(1, dt * 0.25);
    }

    const w = this.width;
    const h = this.height;
    // braille subpixels: 2 wide × 4 tall per cell — and since terminal cells
    // are ~1:2, the subpixels come out square
    const pixelW = w * 2;
    const pixelH = h * 4;
    const radius = Math.min(pixelW, pixelH) / 2 - 1;
    if (radius <= 4) return;
    if (this.levels.length !== pixelW * pixelH) {
      this.levels = new Float64Array(pixelW * pixelH);
    }
    this.levels.fill(-1);

    const cx = pixelW / 2;
    const cy = pixelH / 2;

    const cyaw = Math.cos(this.yaw);
    const syaw = Math.sin(this.yaw);
    const cpit = Math.cos(this.pitch);
    const spit = Math.sin(this.pitch);

    // rotated vertices in view space (y up, z toward viewer) + screen coords
    const vx = new Float64Array(VERTICES.length);
    const vy = new Float64Array(VERTICES.length);
    const vz = new Float64Array(VERTICES.length);
    const sx = new Float64Array(VERTICES.length);
    const sy = new Float64Array(VERTICES.length);
    for (let i = 0; i < VERTICES.length; i++) {
      const v = VERTICES[i];
      if (!v) continue;
      const [x0, y0, z0] = v;
      // Ry(yaw)
      const x1 = x0 * cyaw + z0 * syaw;
      const z1 = -x0 * syaw + z0 * cyaw;
      // Rx(pitch)
      const y2 = y0 * cpit - z1 * spit;
      const z2 = y0 * spit + z1 * cpit;
      vx[i] = x1;
      vy[i] = y2;
      vz[i] = z2;
      sx[i] = cx + x1 * radius;
      sy[i] = cy - y2 * radius; // screen y grows downward
    }

    for (const face of FACES) {
      const [a, b, c] = face;
      if (a === undefined || b === undefined || c === undefined) continue;
      this.rasterizeFace(
        pixelW,
        pixelH,
        [vx[a] ?? 0, vy[a] ?? 0, vz[a] ?? 0, sx[a] ?? 0, sy[a] ?? 0],
        [vx[b] ?? 0, vy[b] ?? 0, vz[b] ?? 0, sx[b] ?? 0, sy[b] ?? 0],
        [vx[c] ?? 0, vy[c] ?? 0, vz[c] ?? 0, sx[c] ?? 0, sy[c] ?? 0],
      );
    }

    this.emitBraille(buffer, w, h, pixelW);
  }

  // Rasterizes one front-facing triangle: flat face normal, per-pixel point
  // light (soft gradient across the face), darkened crease lines along face
  // edges so the faceted silhouette stays legible. Stores raw brightness;
  // dithering happens per braille dot in emitBraille.
  private rasterizeFace(
    pixelW: number,
    pixelH: number,
    p0: [number, number, number, number, number],
    p1: [number, number, number, number, number],
    p2: [number, number, number, number, number],
  ): void {
    // outward flat normal from the mesh (vertices are unit, centroid ≈ normal)
    let nx = (p0[0] + p1[0] + p2[0]) / 3;
    let ny = (p0[1] + p1[1] + p2[1]) / 3;
    let nz = (p0[2] + p1[2] + p2[2]) / 3;
    const nlen = Math.hypot(nx, ny, nz);
    nx /= nlen;
    ny /= nlen;
    nz /= nlen;
    if (nz <= 0) return; // backface

    const [, , , x0, y0] = p0;
    const [, , , x1, y1] = p1;
    const [, , , x2, y2] = p2;
    const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    if (Math.abs(area) < 1e-6) return;

    const minX = Math.max(0, Math.floor(Math.min(x0, x1, x2)));
    const maxX = Math.min(pixelW - 1, Math.ceil(Math.max(x0, x1, x2)));
    const minY = Math.max(0, Math.floor(Math.min(y0, y1, y2)));
    const maxY = Math.min(pixelH - 1, Math.ceil(Math.max(y0, y1, y2)));

    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        const x = px + 0.5;
        const y = py + 0.5;
        const w0 = ((x1 - x) * (y2 - y) - (x2 - x) * (y1 - y)) / area;
        const w1 = ((x2 - x) * (y0 - y) - (x0 - x) * (y2 - y)) / area;
        const w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;

        // surface point in view space for the point-light gradient
        const spx = w0 * p0[0] + w1 * p1[0] + w2 * p2[0];
        const spy = w0 * p0[1] + w1 * p1[1] + w2 * p2[1];
        const spz = w0 * p0[2] + w1 * p1[2] + w2 * p2[2];
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
        let light = 0.18 + diffuse * atten * 1.0 + spec * 0.38;

        // darken along triangle edges — the crease lines are what make the
        // individual facets (and thus the polyhedron) legible at this size
        const edge = Math.min(w0, w1, w2);
        if (edge < 0.05) light *= 0.1 + (edge / 0.05) * 0.9;

        this.levels[py * pixelW + px] = clamp01(light);
      }
    }
  }

  // Packs each 2×4 subpixel block into a braille glyph: a dot turns on when
  // its brightness beats the Bayer threshold at that screen position (ordered
  // dithering — brightness becomes dot density), and the cell's color is the
  // quantised average brightness on the teal ramp.
  private emitBraille(buffer: OptimizedBuffer, w: number, h: number, pixelW: number): void {
    for (let cellY = 0; cellY < h; cellY++) {
      for (let cellX = 0; cellX < w; cellX++) {
        let dots = 0;
        let sum = 0;
        let covered = 0;
        let minThreshold = 1;
        let minThresholdBit = 0;
        for (let sub = 0; sub < 8; sub++) {
          const dx = sub & 1;
          const dy = sub >> 1;
          const px = cellX * 2 + dx;
          const py = cellY * 4 + dy;
          const light = this.levels[py * pixelW + px] ?? -1;
          if (light < 0) continue;
          covered += 1;
          sum += light;
          const bit = BRAILLE_BITS[dy]?.[dx] ?? 0;
          const threshold = BAYER8[py % 8]?.[px % 8] ?? 0.5;
          if (light > threshold) dots |= bit;
          if (threshold < minThreshold) {
            minThreshold = threshold;
            minThresholdBit = bit;
          }
        }
        if (covered === 0) continue;
        // a well-covered cell with zero dots punches a hole in the shape —
        // keep the single most-likely dot instead
        if (dots === 0 && covered >= 4) dots = minThresholdBit;
        if (dots === 0) continue;

        const q =
          Math.max(1, Math.round((sum / covered) * (DITHER_LEVELS - 1))) / (DITHER_LEVELS - 1);
        buffer.setCellWithAlphaBlending(
          this.x + cellX,
          this.y + cellY,
          String.fromCharCode(0x2800 + dots),
          levelColor(q),
          TRANSPARENT,
        );
      }
    }
  }
}

// Braille dot bit values by (row, column) within the 2×4 block.
const BRAILLE_BITS = [
  [0x01, 0x08],
  [0x02, 0x10],
  [0x04, 0x20],
  [0x40, 0x80],
];

// Teal ramp with the brightest step lifted toward white so specular-lit
// dither speckles read as highlights.
function levelColor(q: number): RGBA {
  const lift = q ** 6 * 0.45;
  return RGBA.fromValues(
    clamp01(TINT_R * q + lift),
    clamp01(TINT_G * q + lift),
    clamp01(TINT_B * q + lift),
    1,
  );
}

extend({ hedron: HedronRenderable });

declare module "@opentui/react" {
  interface OpenTUIComponents {
    hedron: typeof HedronRenderable;
  }
}
