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

// Bottom command bar: keybindings on the left, the currently focused target
// (like a targeting reticle readout) on the right.
export function Footer({ keys, target, width }: FooterProps) {
  // Drop the target readout on narrow terminals so it never collides with keys.
  const showTarget = Boolean(target) && width >= 92;
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
      {showTarget ? <text fg={color.accentDim}>{truncate(targetLabel, Math.max(0, width - 44))}</text> : null}
    </box>
  );
}
