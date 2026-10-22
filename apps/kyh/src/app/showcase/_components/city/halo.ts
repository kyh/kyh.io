// The hovered building's lot, ringed in a soft band of the building's own
// color: brightest along the lot's edge, fading to nothing a step either side,
// breathing a little while it's lit.
import { BufferGeometry, DoubleSide, Float32BufferAttribute, Mesh, MeshBasicMaterial } from "three";

import type { Time } from "./palette";
import type { Rect } from "./plan";
import { PALETTE } from "./palette";

/** How far the glow reaches in over the lot, and out over the curb, in cells. */
const INSIDE = 0.36;
const OUTSIDE = 0.2;
/** The band's strongest alpha, on the lot's edge. */
const PEAK: Record<Time, number> = { day: 0.5, night: 0.62 };

/**
 * Triangles for a band round `rect` at height `y`: positions, and each
 * vertex's share of the glow (1 on the edge, 0 at the band's inner and outer
 * rims). Each side is a trapezoid, so the sides meet on a clean miter.
 */
export const haloBand = (rect: Rect, y: number) => {
  const ring = (grow: number) => [
    [rect.x - grow, rect.z - grow],
    [rect.x + rect.w + grow, rect.z - grow],
    [rect.x + rect.w + grow, rect.z + rect.d + grow],
    [rect.x - grow, rect.z + rect.d + grow],
  ];
  const rings = [
    { alpha: 0, corners: ring(-INSIDE) },
    { alpha: 1, corners: ring(0) },
    { alpha: 0, corners: ring(OUTSIDE) },
  ];
  const positions: number[] = [];
  const glow: number[] = [];
  const vertex = (level: number, corner: number) => {
    const { alpha, corners } = rings[level] ?? { alpha: 0, corners: [] };
    const [x = 0, z = 0] = corners[corner % 4] ?? [];
    positions.push(x, y, z);
    glow.push(alpha);
  };
  for (let side = 0; side < 4; side += 1) {
    for (let level = 0; level < 2; level += 1) {
      // Two triangles from this side's strip between ring `level` and the next.
      vertex(level, side);
      vertex(level + 1, side);
      vertex(level + 1, side + 1);
      vertex(level, side);
      vertex(level + 1, side + 1);
      vertex(level, side + 1);
    }
  }
  return { glow, positions };
};

const bandGeometry = (rect: Rect, y: number): BufferGeometry => {
  const geometry = new BufferGeometry();
  const { glow, positions } = haloBand(rect, y);
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  // White, fading out: the material carries the color, the vertices the glow.
  geometry.setAttribute(
    "color",
    new Float32BufferAttribute(
      glow.flatMap((alpha) => [1, 1, 1, alpha]),
      4,
    ),
  );
  return geometry;
};

export const createHalo = () => {
  const material = new MeshBasicMaterial({
    depthWrite: false,
    opacity: 0,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    // Lying flat, seen only from above: which way its triangles wind doesn't matter.
    side: DoubleSide,
    transparent: true,
    vertexColors: true,
  });
  // A real band from the start, unseen at opacity 0, so the engine's first
  // frame can draw it once and the first lit building doesn't wait on its shader.
  const mesh = new Mesh(bandGeometry({ d: 1, w: 1, x: 0, z: 0 }, 0), material);
  mesh.renderOrder = 3;
  mesh.visible = false;
  let tone: Record<Time, string> = PALETTE.accentBlue;
  let level = 0;
  let lit = false;
  return {
    dispose: () => {
      mesh.geometry.dispose();
      material.dispose();
    },
    mesh,
    /** Ring this lot in this color, or let the ring fade with null. */
    show: (lot: { rect: Rect; y: number; tone: Record<Time, string> } | null) => {
      lit = lot !== null;
      if (lot) {
        mesh.geometry.dispose();
        mesh.geometry = bandGeometry(lot.rect, lot.y + 0.012);
        ({ tone } = lot);
      }
    },
    update: (dt: number, time: number, period: Time) => {
      level += ((lit ? 1 : 0) - level) * (1 - Math.exp(-dt * 12));
      mesh.visible = level > 0.01;
      material.color.set(tone[period]);
      material.opacity = level * PEAK[period] * (0.85 + 0.15 * Math.sin(time * 2.6));
    },
  };
};
