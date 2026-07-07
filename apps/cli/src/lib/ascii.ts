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
