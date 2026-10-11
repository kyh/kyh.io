import { Box } from "ink";

import { Hedron } from "./hedron";
import { Panel } from "./panel";

interface TelemetryProps {
  innerWidth: number;
  globeHeight: number;
}

// Framed dithered icosahedron for the left column.
export const Telemetry = ({ innerWidth, globeHeight }: TelemetryProps) => (
  <Panel title="GYROSCOPE" bottomTitle="⟲ SPIN">
    <Box flexDirection="column" alignItems="center">
      <Hedron width={innerWidth} height={globeHeight} />
    </Box>
  </Panel>
);
