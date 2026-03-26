/**
 * Generate SVG path data for the badge pill + curved tail shape.
 *
 * Coordinate system: (0,0) is top-left of the shape bounding box.
 * Total size: (tailLen + pillW) × pillH.
 * The tail tip points left at (0, pillH/2).
 */
export function badgeSvgPath(
  pillW: number,
  pillH: number,
  tailLen: number,
  tailSpread: number,
): string {
  const r = pillH / 2
  const cx = tailLen + pillW - r   // right semicircle center X
  const tl = tailLen + r           // top-left junction X

  return [
    `M${tl},0`,
    `L${cx},0`,
    `A${r},${r},0,0,1,${cx},${pillH}`,
    `L${tl},${pillH}`,
    `C${tailLen + 2},${pillH},${3},${r + tailSpread},0,${r}`,
    `C${3},${r - tailSpread},${tailLen + 2},0,${tl},0`,
    'Z',
  ].join(' ')
}

/**
 * Simple pill (no tail) — a rounded rect.
 */
export function badgePillOnly(pillW: number, pillH: number): string {
  const r = pillH / 2
  return [
    `M${r},0`,
    `L${pillW - r},0`,
    `A${r},${r},0,0,1,${pillW - r},${pillH}`,
    `L${r},${pillH}`,
    `A${r},${r},0,0,1,${r},0`,
    'Z',
  ].join(' ')
}

/** Badge geometry constants */
export const BADGE_PAD_X = 10
export const BADGE_PAD_Y = 3
export const BADGE_TAIL_LEN = 5
export const BADGE_TAIL_SPREAD = 2.5
export const BADGE_LINE_H = 16
