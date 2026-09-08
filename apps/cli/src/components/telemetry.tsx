import { Panel } from "./panel";
import "./hedron";

interface TelemetryProps {
  innerWidth: number;
  globeHeight: number;
}

// Framed dithered icosahedron for the left column — drag it to spin.
export const Telemetry = ({ innerWidth, globeHeight }: TelemetryProps) => (
  <Panel title="GYROSCOPE" bottomTitle="⟲ DRAG">
    <box flexDirection="column" alignItems="center">
      <hedron width={innerWidth} height={globeHeight} />
    </box>
  </Panel>
);
