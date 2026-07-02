// Tiny CPU renderers that fill a luminance buffer and map it to a glyph ramp —
// the terminal-native equivalent of a WebGL render → dither → ASCII pipeline.
// Resolution is a few hundred cells, so this is effectively free per frame.

// Dark → bright. Index 0 (space) reads as empty.
const RAMP = " .:-=+*#%@";
// Terminal cells are ~twice as tall as they are wide; correct for round shapes.
const CELL_ASPECT = 2.0;

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

function glyph(brightness: number): string {
  const i = clamp(Math.round(brightness * (RAMP.length - 1)), 0, RAMP.length - 1);
  return RAMP[i]!;
}

// A rotating, lit, lat/long-gridded sphere. Longitude lines sweep with `tMs`,
// so the globe visibly spins; a fixed light gives it limb shading.
export function renderGlobe(w: number, h: number, tMs: number): string[] {
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w / 2, h) * 0.96;
  const rx = R;
  const ry = R / CELL_ASPECT;
  const yaw = (tMs / 1000) * 0.7; // rad/s spin

  // view-space light direction (upper-left, toward viewer)
  const ll = Math.hypot(-0.4, -0.5, 0.85);
  const lx = -0.4 / ll;
  const ly = -0.5 / ll;
  const lz = 0.85 / ll;

  const STEP = Math.PI / 12; // 15° grid
  const lines: string[] = [];

  for (let yc = 0; yc < h; yc++) {
    let row = "";
    for (let xc = 0; xc < w; xc++) {
      const nx = (xc + 0.5 - cx) / rx;
      const ny = (yc + 0.5 - cy) / ry;
      const d2 = nx * nx + ny * ny;
      if (d2 > 1) {
        row += " ";
        continue;
      }
      const nz = Math.sqrt(1 - d2);

      // diffuse lighting from the view-space normal (nx, ny, nz)
      const diffuse = Math.max(0, nx * lx + ny * ly + nz * lz);

      // rotate the surface point back into texture space (about Y by -yaw)
      const cos = Math.cos(yaw);
      const sin = Math.sin(yaw);
      const wx = nx * cos + nz * sin;
      const wz = -nx * sin + nz * cos;
      const lat = Math.asin(clamp(ny, -1, 1));
      const lon = Math.atan2(wx, wz);

      const dLat = Math.abs(lat / STEP - Math.round(lat / STEP));
      const dLon = Math.abs(lon / STEP - Math.round(lon / STEP));
      const onGrid = dLat < 0.08 || dLon < 0.08;

      // faint body so the disk reads as a ball; bright meridians/parallels on
      // top, lit-side lines brighter — the moving longitude lines sell the spin
      const b = onGrid ? 0.5 + diffuse * 0.5 : 0.1 + diffuse * 0.16;
      row += glyph(clamp(b, 0, 1));
    }
    lines.push(row);
  }
  return lines;
}

// 4×4 Bayer matrix (normalised) for ordered dithering — softens the banding
// you'd otherwise get quantising a smooth field onto a 10-step ramp.
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((r) => r.map((v) => v / 16 - 0.5));

// A flowing interference/plasma field — layered sines plus a radial ripple.
export function renderWaves(w: number, h: number, tMs: number): string[] {
  const t = tMs / 1000;
  const lines: string[] = [];
  for (let y = 0; y < h; y++) {
    let row = "";
    for (let x = 0; x < w; x++) {
      const v =
        Math.sin(x * 0.25 + t * 2.0) +
        Math.sin(y * 0.7 + t * 1.3) +
        Math.sin((x + y) * 0.18 - t * 1.7) +
        Math.sin(Math.hypot(x - w / 2, (y - h / 2) * CELL_ASPECT) * 0.22 - t * 2.2);
      const b = (v + 4) / 8 + BAYER[y % 4]![x % 4]! / RAMP.length;
      row += glyph(clamp(b, 0, 1));
    }
    lines.push(row);
  }
  return lines;
}
