/**
 * Fritsch-Carlson monotone cubic interpolation.
 * Guarantees no overshoots — the curve never exceeds local min/max.
 * Used by Chart.js (monotone mode) and D3 (curveMonotoneX).
 *
 * Continues from current ctx position — caller must moveTo first point.
 */
export function drawSpline(
  ctx: CanvasRenderingContext2D,
  pts: [number, number][],
) {
  if (pts.length < 2) return
  if (pts.length === 2) {
    ctx.lineTo(pts[1][0], pts[1][1])
    return
  }

  const n = pts.length

  // 1. Compute secant slopes (delta) between consecutive points
  const delta: number[] = new Array(n - 1)
  const h: number[] = new Array(n - 1) // x-intervals
  for (let i = 0; i < n - 1; i++) {
    h[i] = pts[i + 1][0] - pts[i][0]
    delta[i] = h[i] === 0 ? 0 : (pts[i + 1][1] - pts[i][1]) / h[i]
  }

  // 2. Initial tangent estimates
  const m: number[] = new Array(n)
  m[0] = delta[0]
  m[n - 1] = delta[n - 2]
  for (let i = 1; i < n - 1; i++) {
    if (delta[i - 1] * delta[i] <= 0) {
      // Sign change or zero — tangent must be zero for monotonicity
      m[i] = 0
    } else {
      m[i] = (delta[i - 1] + delta[i]) / 2
    }
  }

  // 3. Fritsch-Carlson constraint: alpha^2 + beta^2 <= 9
  for (let i = 0; i < n - 1; i++) {
    if (delta[i] === 0) {
      // Flat segment — zero both endpoint tangents
      m[i] = 0
      m[i + 1] = 0
    } else {
      const alpha = m[i] / delta[i]
      const beta = m[i + 1] / delta[i]
      const s2 = alpha * alpha + beta * beta
      if (s2 > 9) {
        const s = 3 / Math.sqrt(s2)
        m[i] = s * alpha * delta[i]
        m[i + 1] = s * beta * delta[i]
      }
    }
  }

  // 4. Draw bezier curves using tangents as control points
  for (let i = 0; i < n - 1; i++) {
    const hi = h[i]
    ctx.bezierCurveTo(
      pts[i][0] + hi / 3,
      pts[i][1] + m[i] * hi / 3,
      pts[i + 1][0] - hi / 3,
      pts[i + 1][1] - m[i + 1] * hi / 3,
      pts[i + 1][0],
      pts[i + 1][1],
    )
  }
}
