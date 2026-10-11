import { Box, Text } from "ink";

import type { ContactLink } from "../data/content";
import { color } from "../lib/theme";
import { pad } from "../lib/utils";
import { Panel } from "./panel";

interface CommsProps {
  links: ContactLink[];
  selectedIndex: number;
  innerWidth: number;
}

const LABEL_WIDTH = 12;

export const Comms = ({ links, selectedIndex, innerWidth }: CommsProps) => (
  <Panel title="COMMS // UPLINK" bottomTitle="ENCRYPTED" flexGrow={1}>
    <Box flexDirection="column" paddingTop={1}>
      <Text color={color.faint}>SELECT A CHANNEL TO ESTABLISH CONNECTION</Text>
      <Box paddingTop={1} flexDirection="column">
        {links.map((link, i) => {
          const selected = i === selectedIndex;
          const label = link.label.toUpperCase().padEnd(LABEL_WIDTH);

          if (selected) {
            return (
              <Box
                key={link.label}
                flexDirection="row"
                width={innerWidth}
                backgroundColor={color.accent}
              >
                <Text backgroundColor={color.accent} color={color.black}>
                  {"▶ "}
                </Text>
                <Text backgroundColor={color.accent} color={color.black} bold>
                  {label}
                </Text>
                <Text backgroundColor={color.accent} color={color.black}>
                  {pad(link.value, Math.max(0, innerWidth - LABEL_WIDTH - 2))}
                </Text>
              </Box>
            );
          }

          return (
            <Box key={link.label} flexDirection="row">
              <Text color={color.ghost}>{"  "}</Text>
              <Text color={color.accentDim}>{label}</Text>
              <Text color={color.dim}>
                {pad(link.value, Math.max(0, innerWidth - LABEL_WIDTH - 2))}
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  </Panel>
);
