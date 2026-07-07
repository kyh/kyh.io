import { Panel } from "./Panel";
import "./Hedron";

type TelemetryProps = {
  innerWidth: number;
  globeHeight: number;
};

// Framed dithered icosahedron for the left column — drag it to spin.
export function Telemetry({ innerWidth, globeHeight }: TelemetryProps) {
  return (
    <Panel title="GYROSCOPE" bottomTitle="⟲ DRAG">
      <box flexDirection="column" alignItems="center">
        <hedron width={innerWidth} height={globeHeight} />
      </box>
    </Panel>
  );
}
