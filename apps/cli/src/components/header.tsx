import { Box, Text } from "ink";

import { color } from "../lib/theme";

interface HeaderProps {
  clock: string;
  version: string;
}

// Top system bar: identity on the left, live status + clock on the right,
// sitting above a hairline divider.
export const Header = ({ clock, version }: HeaderProps) => (
  <Box
    flexDirection="row"
    alignItems="center"
    borderStyle="single"
    borderTop={false}
    borderLeft={false}
    borderRight={false}
    borderColor={color.border}
    paddingLeft={1}
    paddingRight={1}
  >
    <Text bold color={color.accent}>
      KYH.IO
    </Text>
    <Text color={color.faint}>{" // "}</Text>
    <Text color={color.dim}>PERSONAL TERMINAL</Text>
    <Text color={color.ghost}>{`  v${version}`}</Text>

    <Box flexGrow={1} />

    <Text color={color.accent}>●</Text>
    <Text color={color.dim}> SYSTEM </Text>
    <Text bold color={color.accent}>
      ONLINE
    </Text>
    <Text color={color.faint}>{"   "}</Text>
    <Text bold color={color.text}>
      {clock}
    </Text>
  </Box>
);
