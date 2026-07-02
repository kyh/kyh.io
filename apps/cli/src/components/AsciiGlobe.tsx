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
  const frame = renderGlobe(width, height, t).join("\n");

  return <text fg={fg}>{frame}</text>;
}
