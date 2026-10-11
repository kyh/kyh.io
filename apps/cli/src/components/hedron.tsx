import { useMemo } from "react";
import { Box, Text, useAnimation } from "ink";

import { renderHedron } from "../lib/hedron";

interface HedronProps {
  width: number;
  height: number;
  fps?: number;
}

export const Hedron = ({ width, height, fps = 15 }: HedronProps) => {
  const { time } = useAnimation({ interval: Math.round(1000 / fps) });
  const rows = useMemo(() => renderHedron(width, height, time), [width, height, time]);

  return (
    <Box flexDirection="column" width={width} height={height}>
      {rows.map((row) => (
        <Text key={row.y}>
          {row.spans.map((span) => (
            <Text key={span.x} color={span.color}>
              {span.text}
            </Text>
          ))}
        </Text>
      ))}
    </Box>
  );
};
