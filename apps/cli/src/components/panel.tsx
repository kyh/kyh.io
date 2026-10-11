import { useRef } from "react";
import type { ReactNode } from "react";
import { Box, Text, useBoxMetrics } from "ink";
import type { DOMElement } from "ink";

import { color, panelBorder } from "../lib/theme";

interface PanelProps {
  title?: string;
  bottomTitle?: string;
  active?: boolean;
  children: ReactNode;
  flexGrow?: number;
  width?: number | `${number}%`;
  height?: number | `${number}%`;
  padding?: number;
}

const rule = (
  left: string,
  right: string,
  width: number,
  label: string | undefined,
  align: "left" | "right",
) => {
  const fill = Math.max(0, width - 2);
  if (!label || label.length + 2 > fill) {
    return `${left}${panelBorder.horizontal.repeat(fill)}${right}`;
  }
  const rest = panelBorder.horizontal.repeat(fill - label.length - 1);
  const middle =
    align === "left"
      ? `${panelBorder.horizontal}${label}${rest}`
      : `${rest}${label}${panelBorder.horizontal}`;
  return `${left}${middle}${right}`;
};

// A single HUD frame: thin squared border with a tiny uppercase label bitten
// into the top edge, matching the reference terminal dashboards. Ink borders
// take no labels, so the top and bottom edges are drawn as text at the
// measured width.
export const Panel = ({
  title,
  bottomTitle,
  active = false,
  children,
  flexGrow,
  width,
  height,
  padding = 1,
}: PanelProps) => {
  const ref = useRef<DOMElement>(null);
  const { width: measured } = useBoxMetrics(ref);
  const borderColor = active ? color.borderActive : color.border;

  return (
    <Box
      ref={ref}
      flexDirection="column"
      flexGrow={flexGrow}
      width={width}
      height={height}
      backgroundColor={color.bg}
    >
      <Text color={borderColor}>
        {rule(
          panelBorder.topLeft,
          panelBorder.topRight,
          measured,
          title ? ` ${title} ` : undefined,
          "left",
        )}
      </Text>
      <Box
        flexDirection="column"
        flexGrow={1}
        borderStyle="single"
        borderTop={false}
        borderBottom={false}
        borderColor={borderColor}
        paddingLeft={padding}
        paddingRight={padding}
      >
        {children}
      </Box>
      <Text color={borderColor}>
        {rule(
          panelBorder.bottomLeft,
          panelBorder.bottomRight,
          measured,
          bottomTitle ? ` ${bottomTitle} ` : undefined,
          "right",
        )}
      </Text>
    </Box>
  );
};
