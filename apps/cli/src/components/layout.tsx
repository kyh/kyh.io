import type { ReactNode } from "react";
import { box, BOX_WIDTH, BOX_OUTER_WIDTH } from "../lib/theme";

type LayoutProps = {
  title?: string;
  footer: ReactNode;
  children: ReactNode;
};

export function Layout({ title, footer, children }: LayoutProps) {
  const headerLine = title
    ? `${box.topLeft}${box.horizontal} ${title} ${box.horizontal.repeat(BOX_WIDTH - title.length - 3)}${box.topRight}`
    : `${box.topLeft}${box.horizontal.repeat(BOX_WIDTH)}${box.topRight}`;

  return (
    <box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      <box flexDirection="column" style={{ width: BOX_OUTER_WIDTH }}>
        <text>{headerLine}</text>
        <text>{box.vertical}{" ".repeat(BOX_WIDTH)}{box.vertical}</text>
        {children}
        <text>{box.vertical}{" ".repeat(BOX_WIDTH)}{box.vertical}</text>
        <text>{box.dividerLeft}{box.horizontal.repeat(BOX_WIDTH)}{box.dividerRight}</text>
        <box flexDirection="row">
          <text>{box.vertical}</text>
          {footer}
          <text>{box.vertical}</text>
        </box>
        <text>{box.bottomLeft}{box.horizontal.repeat(BOX_WIDTH)}{box.bottomRight}</text>
      </box>
    </box>
  );
}
