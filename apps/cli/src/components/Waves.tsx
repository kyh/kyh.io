import { useTick } from "../lib/hooks";
import { renderWaves } from "../lib/ascii";
import { color } from "../lib/theme";

type WavesProps = {
  width: number;
  height: number;
  fps?: number;
  fg?: string;
};

// Animated interference/plasma strip used as a live "signal" readout.
export function Waves({ width, height, fps = 12, fg = color.accentDim }: WavesProps) {
  const t = useTick(fps);
  const frame = renderWaves(width, height, t).join("\n");

  return <text fg={fg}>{frame}</text>;
}
