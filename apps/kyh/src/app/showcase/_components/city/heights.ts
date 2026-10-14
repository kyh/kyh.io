// How high the town's flat tops stand, cell by cell: roofs, ledges, plazas.
// Worked out once from the drawing's faces that face up, so something held
// over a building hangs over its roof and casts its shadow there.
import type { Sketch } from "./sketch";

/** Samples a cell. */
const STEP = 0.25;
/** A face this upright or more is a top: tilted roofs and walls aren't. */
const FLAT = 0.86;

interface Field {
  x: number;
  z: number;
  columns: number;
  rows: number;
  tops: Float32Array;
}

const fieldOver = (sketches: readonly Sketch[]): Field | null => {
  let minX = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxZ = -Infinity;
  for (const sketch of sketches) {
    for (const positions of sketch.faces.values()) {
      for (let index = 0; index + 2 < positions.length; index += 3) {
        const x = positions[index] ?? 0;
        const z = positions[index + 2] ?? 0;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minZ = Math.min(minZ, z);
        maxZ = Math.max(maxZ, z);
      }
    }
  }
  if (!Number.isFinite(minX)) {
    return null;
  }
  const columns = Math.ceil((maxX - minX) / STEP) + 1;
  const rows = Math.ceil((maxZ - minZ) / STEP) + 1;
  return { columns, rows, tops: new Float32Array(columns * rows), x: minX, z: minZ };
};

/** Which cells a flat triangle at height `y` covers: the ones whose centers fall inside it. */
const fill = (
  field: Field,
  ax: number,
  az: number,
  bx: number,
  bz: number,
  cx: number,
  cz: number,
  y: number,
) => {
  const area = (bx - ax) * (cz - az) - (cx - ax) * (bz - az);
  if (Math.abs(area) < 1e-9) {
    return;
  }
  const first = Math.max(0, Math.floor((Math.min(ax, bx, cx) - field.x) / STEP));
  const last = Math.min(field.columns - 1, Math.ceil((Math.max(ax, bx, cx) - field.x) / STEP));
  const top = Math.max(0, Math.floor((Math.min(az, bz, cz) - field.z) / STEP));
  const bottom = Math.min(field.rows - 1, Math.ceil((Math.max(az, bz, cz) - field.z) / STEP));
  for (let row = top; row <= bottom; row += 1) {
    const pz = field.z + row * STEP;
    for (let column = first; column <= last; column += 1) {
      const px = field.x + column * STEP;
      const u = ((bx - px) * (cz - pz) - (cx - px) * (bz - pz)) / area;
      const v = ((cx - px) * (az - pz) - (ax - px) * (cz - pz)) / area;
      if (u >= -1e-6 && v >= -1e-6 && u + v <= 1 + 1e-6) {
        const cell = row * field.columns + column;
        field.tops[cell] = Math.max(field.tops[cell] ?? 0, y);
      }
    }
  }
};

/**
 * The height of the highest flat top over each point of these sketches, with
 * `floor` wherever there's none higher.
 */
export const createHeights = (
  sketches: readonly Sketch[],
  floor: (x: number, z: number) => number,
) => {
  const field = fieldOver(sketches);
  if (field) {
    for (const sketch of sketches) {
      for (const positions of sketch.faces.values()) {
        for (let index = 0; index + 8 < positions.length; index += 9) {
          const [ax = 0, ay = 0, az = 0, bx = 0, by = 0, bz = 0, cx = 0, cy = 0, cz = 0] =
            positions.slice(index, index + 9);
          const ux = bx - ax;
          const uy = by - ay;
          const uz = bz - az;
          const vx = cx - ax;
          const vy = cy - ay;
          const vz = cz - az;
          const nx = uy * vz - uz * vy;
          const ny = uz * vx - ux * vz;
          const nz = ux * vy - uy * vx;
          if (ny >= FLAT * Math.hypot(nx, ny, nz)) {
            fill(field, ax, az, bx, bz, cx, cz, Math.max(ay, by, cy));
          }
        }
      }
    }
  }
  return (x: number, z: number) => {
    const base = floor(x, z);
    if (!field) {
      return base;
    }
    const column = Math.round((x - field.x) / STEP);
    const row = Math.round((z - field.z) / STEP);
    if (column < 0 || row < 0 || column >= field.columns || row >= field.rows) {
      return base;
    }
    return Math.max(base, field.tops[row * field.columns + column] ?? 0);
  };
};
