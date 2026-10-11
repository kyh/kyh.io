import { Box, Text } from "ink";

import { profile } from "../data/content";
import { color } from "../lib/theme";
import { Panel } from "./panel";
import { Waves } from "./waves";

interface StatusPanelProps {
  uptime: string;
  entries: number;
  online: boolean;
  innerWidth: number;
}

const LABEL_WIDTH = 10;

const Readout = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <Box flexDirection="row">
    <Text color={color.faint}>{label.padEnd(LABEL_WIDTH)}</Text>
    {children}
  </Box>
);

export const StatusPanel = ({ uptime, entries, online, innerWidth }: StatusPanelProps) => (
  <Panel title="STATUS">
    <Box flexDirection="column" paddingTop={1}>
      <Readout label="UPTIME">
        <Text color={color.text}>{uptime}</Text>
      </Readout>
      <Readout label="LOCATION">
        <Text color={color.dim}>{profile.location}</Text>
      </Readout>
      <Readout label="CHANNEL">
        <Text color={color.dim}>{profile.channel}</Text>
      </Readout>
      <Readout label="ENTRIES">
        <Text color={color.dim}>{`${entries} INDEXED`}</Text>
      </Readout>
      <Readout label="LINK">
        <>
          <Text color={online ? color.accent : color.dim}>{online ? "● " : "○ "}</Text>
          <Text bold color={online ? color.accent : color.dim}>
            {online ? "SECURE" : "OFFLINE"}
          </Text>
        </>
      </Readout>
      <Box flexDirection="row" paddingTop={1}>
        <Text color={color.faint}>{"SIGNAL".padEnd(LABEL_WIDTH)}</Text>
        <Waves width={Math.max(0, innerWidth - LABEL_WIDTH)} height={2} />
      </Box>
    </Box>
  </Panel>
);
