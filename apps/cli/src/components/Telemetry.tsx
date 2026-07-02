import { AsciiGlobe } from "./AsciiGlobe";
import { Panel } from "./Panel";

type TelemetryProps = {
  innerWidth: number;
  globeHeight: number;
};

// Framed spinning-globe visualization for the left column.
export function Telemetry({ innerWidth, globeHeight }: TelemetryProps) {
  return (
    <Panel title="ORBITAL UPLINK" bottomTitle="◍ LIVE">
      <box flexDirection="column" alignItems="center">
        <AsciiGlobe width={innerWidth} height={globeHeight} />
      </box>
    </Panel>
  );
}
