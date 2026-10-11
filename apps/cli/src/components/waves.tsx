import { useMemo } from "react";
import { Text, useAnimation } from "ink";

import { renderWaves } from "../lib/ascii";
import { color } from "../lib/theme";

interface WavesProps {
  width: number;
  height: number;
  fps?: number;
  fg?: string;
}

// Animated interference/plasma strip used as a live "signal" readout.
export const Waves = ({ width, height, fps = 12, fg = color.accentDim }: WavesProps) => {
  const { time } = useAnimation({ interval: Math.round(1000 / fps) });
  const frame = useMemo(() => renderWaves(width, height, time).join("\n"), [width, height, time]);

  return <Text color={fg}>{frame}</Text>;
};
