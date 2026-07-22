import { Fragment } from "react";

import { color, panelBorder } from "../lib/theme";
import { truncate } from "../lib/utils";

type Key = { keys: string; label: string };

type FooterProps = {
  keys: Key[];
  target?: string;
  width: number;
};

function KeyHint({ keys, label }: Key) {
  return (
    <Fragment>
      <text fg={color.faint}>[</text>
      <text fg={color.accent}>{keys}</text>
      <text fg={color.faint}>]</text>
      <text fg={color.dim}>{` ${label}`}</text>
    </Fragment>
  );
}

// Rendered width of one hint: "[" + keys + "] " + label.
const hintWidth = (k: Key) => k.keys.length + k.label.length + 3;
const SEP = 3; // "   " between hints
const GAP = 2; // min gap between keys and the target readout

// Bottom command bar: keybindings on the left, the currently focused target
// (like a targeting reticle readout) on the right.
export function Footer({ keys, target, width }: FooterProps) {
  const keysWidth =
    keys.reduce((sum, k) => sum + hintWidth(k), 0) + SEP * Math.max(0, keys.length - 1);
  // Budget the target against the actual keys width (+ padding) so it can never
  // overflow into the keys or the right edge.
  const targetBudget = width - 2 - keysWidth - GAP;
  const showTarget = Boolean(target) && targetBudget >= 16;
  const targetLabel = `TARGET ▸ ${target}`;
  return (
    <box
      flexDirection="row"
      alignItems="center"
      border={["top"]}
      borderStyle="single"
      customBorderChars={panelBorder}
      borderColor={color.border}
      paddingLeft={1}
      paddingRight={1}
    >
      {keys.map((k, i) => (
        <Fragment key={k.keys}>
          {i > 0 && <text fg={color.ghost}>{"   "}</text>}
          <KeyHint {...k} />
        </Fragment>
      ))}
      <box flexGrow={1} />
      {showTarget ? (
        <text fg={color.accentDim}>{truncate(targetLabel, Math.max(0, targetBudget))}</text>
      ) : null}
    </box>
  );
}
