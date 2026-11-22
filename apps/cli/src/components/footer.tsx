import { Fragment } from "react";
import { Box, Text } from "ink";

import { color } from "../lib/theme";
import { truncate } from "../lib/utils";

interface Key {
  keys: string;
  label: string;
}

interface FooterProps {
  keys: Key[];
  target?: string;
  width: number;
}

const KeyHint = ({ keys, label }: Key) => (
  <>
    <Text color={color.faint}>[</Text>
    <Text color={color.accent}>{keys}</Text>
    <Text color={color.faint}>]</Text>
    <Text color={color.dim}>{` ${label}`}</Text>
  </>
);

const hintWidth = (k: Key) => k.keys.length + k.label.length + 3;
const SEP = 3;
const GAP = 2;

export const Footer = ({ keys, target, width }: FooterProps) => {
  const keysWidth =
    keys.reduce((sum, k) => sum + hintWidth(k), 0) + SEP * Math.max(0, keys.length - 1);

  const targetBudget = width - 4 - keysWidth - GAP;
  const showTarget = Boolean(target) && targetBudget >= 16;
  const targetLabel = `TARGET ▸ ${target}`;

  return (
    <Box
      flexDirection="row"
      alignItems="center"
      borderStyle="single"
      borderBottom={false}
      borderLeft={false}
      borderRight={false}
      borderColor={color.border}
      paddingLeft={1}
      paddingRight={1}
    >
      {keys.map((k, i) => (
        <Fragment key={k.keys}>
          {i > 0 && <Text color={color.ghost}>{"   "}</Text>}
          <KeyHint {...k} />
        </Fragment>
      ))}
      <Box flexGrow={1} />
      {showTarget ? (
        <Text color={color.accentDim}>{truncate(targetLabel, Math.max(0, targetBudget))}</Text>
      ) : null}
    </Box>
  );
};
