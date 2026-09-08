/**
 * Fritsch-Carlson monotone cubic interpolation.
 * Guarantees no overshoots — the curve never exceeds local min/max.
 * Used by Chart.js (monotone mode) and D3 (curveMonotoneX).
 *
 * Continues from current ctx position — caller must moveTo first point.
 */
export const drawSpline = (ctx: CanvasRenderingContext2D, pts: [number, number][]) => {
  if (pts.length < 2) {
    return;
  }
  if (pts.length === 2) {
    ctx.lineTo(pts[1][0], pts[1][1]);
    return;
  }

  const n = pts.length;

  // 1. x-intervals and secant slopes (delta) between consecutive points
  const h = Array.from({ length: n - 1 }, (_, i) => pts[i + 1][0] - pts[i][0]);
  const delta = h.map((hi, i) => (hi === 0 ? 0 : (pts[i + 1][1] - pts[i][1]) / hi));

  // 2. Initial tangent estimates — zero on sign change for monotonicity
  const m = Array.from({ length: n }, (_, i) => {
    if (i === 0) {
      return delta[0];
    }
    if (i === n - 1) {
      return delta[n - 2];
    }
    return delta[i - 1] * delta[i] <= 0 ? 0 : (delta[i - 1] + delta[i]) / 2;
  });

  // 3. Fritsch-Carlson constraint: alpha^2 + beta^2 <= 9
  for (let i = 0; i < n - 1; i += 1) {
    if (delta[i] === 0) {
      // Flat segment — zero both endpoint tangents
      m[i] = 0;
      m[i + 1] = 0;
    } else {
      const alpha = m[i] / delta[i];
      const beta = m[i + 1] / delta[i];
      const s2 = alpha * alpha + beta * beta;
      if (s2 > 9) {
        const s = 3 / Math.sqrt(s2);
        m[i] = s * alpha * delta[i];
        m[i + 1] = s * beta * delta[i];
      }
    }
  }

  // 4. Draw bezier curves using tangents as control points
  for (let i = 0; i < n - 1; i += 1) {
    const hi = h[i];
    ctx.bezierCurveTo(
      pts[i][0] + hi / 3,
      pts[i][1] + (m[i] * hi) / 3,
      pts[i + 1][0] - hi / 3,
      pts[i + 1][1] - (m[i + 1] * hi) / 3,
      pts[i + 1][0],
      pts[i + 1][1],
    );
  }
};
