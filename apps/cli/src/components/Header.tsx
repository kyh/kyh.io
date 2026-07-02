import { TextAttributes } from "@opentui/core";

import { color, panelBorder } from "../lib/theme";

type HeaderProps = {
  clock: string;
  spinner: string;
  version: string;
};

// Top system bar: identity on the left, live status + clock on the right,
// sitting above a hairline divider.
export function Header({ clock, spinner, version }: HeaderProps) {
  return (
    <box
      flexDirection="row"
      alignItems="center"
      border={["bottom"]}
      borderStyle="single"
      customBorderChars={panelBorder}
      borderColor={color.border}
      paddingLeft={1}
      paddingRight={1}
      paddingBottom={0}
    >
      <text attributes={TextAttributes.BOLD} fg={color.accent}>
        KYH.IO
      </text>
      <text fg={color.faint}>{" // "}</text>
      <text fg={color.dim}>PERSONAL TERMINAL</text>
      <text fg={color.ghost}>{`  v${version}`}</text>

      <box flexGrow={1} />

      <text fg={color.accent}>{spinner}</text>
      <text fg={color.dim}> SYSTEM </text>
      <text attributes={TextAttributes.BOLD} fg={color.accent}>
        ONLINE
      </text>
      <text fg={color.faint}>{"   "}</text>
      <text attributes={TextAttributes.BOLD} fg={color.text}>
        {clock}
      </text>
    </box>
  );
}
