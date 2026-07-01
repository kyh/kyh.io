import type { ReactNode } from "react";

import { color, panelBorder } from "../lib/theme";

type PanelProps = {
  title?: string;
  bottomTitle?: string;
  active?: boolean;
  children: ReactNode;
  flexGrow?: number;
  width?: number | `${number}%`;
  height?: number | `${number}%`;
  minHeight?: number;
  padding?: number;
};

// A single HUD frame: thin squared border with a tiny uppercase label bitten
// into the top edge, matching the reference terminal dashboards.
export function Panel({
  title,
  bottomTitle,
  active = false,
  children,
  flexGrow,
  width,
  height,
  padding = 1,
}: PanelProps) {
  return (
    <box
      border
      borderStyle="single"
      customBorderChars={panelBorder}
      borderColor={active ? color.borderActive : color.border}
      title={title ? ` ${title} ` : undefined}
      titleAlignment="left"
      bottomTitle={bottomTitle ? ` ${bottomTitle} ` : undefined}
      bottomTitleAlignment="right"
      backgroundColor={color.bg}
      flexDirection="column"
      flexGrow={flexGrow}
      width={width}
      height={height}
      paddingLeft={padding}
      paddingRight={padding}
    >
      {children}
    </box>
  );
}
