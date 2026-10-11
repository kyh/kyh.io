import { Box, Text } from "ink";

import { callsign, name, profile } from "../data/content";
import { color } from "../lib/theme";
import { wrapText } from "../lib/utils";
import { Panel } from "./panel";

interface IdentityProps {
  hero: string;
  innerWidth: number;
}

export const Identity = ({ hero, innerWidth }: IdentityProps) => {
  // always render the full bio — the globe panel yields (app.tsx) rather than
  // this text getting clipped
  const bioLines = wrapText(hero, innerWidth);

  return (
    <Panel title="IDENTITY" flexGrow={1}>
      <Box flexDirection="column" paddingTop={1}>
        <Text color={color.accent}>{callsign.join("\n")}</Text>
        <Box flexDirection="row" paddingTop={1}>
          <Text bold color={color.text}>
            {name.toUpperCase()}
          </Text>
        </Box>
        <Text color={color.dim}>{profile.role}</Text>
        <Box paddingTop={1} flexDirection="column">
          {bioLines.map((line) => (
            <Text key={line} color={color.faint}>
              {line}
            </Text>
          ))}
        </Box>
      </Box>
    </Panel>
  );
};
