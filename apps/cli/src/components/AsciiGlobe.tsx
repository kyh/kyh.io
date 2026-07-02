import { useMemo } from "react";

import { useTick } from "../lib/hooks";
import { renderGlobe } from "../lib/ascii";
import { color } from "../lib/theme";

type AsciiGlobeProps = {
  width: number;
  height: number;
  fg?: string;
};

// Spinning ASCII globe. Each row is a single accent-colored text line; the glyph
// ramp carries the shading, so no per-cell color work is needed per frame.
export function AsciiGlobe({ width, height, fg = color.accent }: AsciiGlobeProps) {
  const t = useTick(15);
  // only recompute when the frame time (or size) changes, not on unrelated
  // parent re-renders from the clock/spinner
  const frame = useMemo(() => renderGlobe(width, height, t).join("\n"), [width, height, t]);

  return <text fg={fg}>{frame}</text>;
}
