import { useKeyboard } from "@opentui/react";
import { useState } from "react";
import { about } from "../data/content";
import { box, nav, colors, BOX_WIDTH, BOX_OUTER_WIDTH, MENU_LABEL_WIDTH, MENU_DESC_WIDTH } from "../lib/theme";
import type { View } from "../lib/types";

type MenuProps = {
  onSelect: (view: View) => void;
};

const menuItems: { key: View; label: string; description: string }[] = [
  { key: "projects", label: "Projects", description: "Browse my work" },
  { key: "about", label: "About", description: "Background & story" },
  { key: "contact", label: "Contact", description: "Get in touch" },
];

export function Menu({ onSelect }: MenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useKeyboard((key) => {
    switch (key.name) {
      case "up":
      case "k":
        setSelectedIndex((i) => (i > 0 ? i - 1 : menuItems.length - 1));
        break;
      case "down":
      case "j":
        setSelectedIndex((i) => (i < menuItems.length - 1 ? i + 1 : 0));
        break;
      case "return": {
        const item = menuItems[selectedIndex];
        if (item) onSelect(item.key);
        break;
      }
      case "escape":
      case "q":
        process.exit(0);
        break;
    }
  });

  return (
    <box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      <box flexDirection="column" style={{ width: BOX_OUTER_WIDTH }}>
        {/* Header */}
        <text>{box.topLeft}{box.horizontal.repeat(BOX_WIDTH)}{box.topRight}</text>
        <text>{box.vertical}  {about.name.padEnd(BOX_WIDTH - 2)}{box.vertical}</text>
        <box flexDirection="row">
          <text>{box.vertical}</text>
          <text fg={colors.muted}>  {about.tagline.padEnd(BOX_WIDTH - 2)}</text>
          <text>{box.vertical}</text>
        </box>
        <text>{box.dividerLeft}{box.horizontal.repeat(BOX_WIDTH)}{box.dividerRight}</text>

        {/* Menu items */}
        <text>{box.vertical}{" ".repeat(BOX_WIDTH)}{box.vertical}</text>
        {menuItems.map((item, index) => {
          const isSelected = index === selectedIndex;
          const prefix = isSelected ? nav.selected : " ";
          const label = `${prefix} ${item.label}`.padEnd(MENU_LABEL_WIDTH);
          const desc = item.description.padEnd(MENU_DESC_WIDTH);

          return (
            <text key={item.key} fg={isSelected ? colors.highlight : undefined}>
              {box.vertical}  {label}{desc}{box.vertical}
            </text>
          );
        })}
        <text>{box.vertical}{" ".repeat(BOX_WIDTH)}{box.vertical}</text>

        {/* Footer */}
        <text>{box.dividerLeft}{box.horizontal.repeat(BOX_WIDTH)}{box.dividerRight}</text>
        <box flexDirection="row">
          <text>{box.vertical}</text>
          <text fg={colors.dim}>{`  ${nav.arrowUp}${nav.arrowDown} navigate   enter select   q quit`.padEnd(BOX_WIDTH)}</text>
          <text>{box.vertical}</text>
        </box>
        <text>{box.bottomLeft}{box.horizontal.repeat(BOX_WIDTH)}{box.bottomRight}</text>
      </box>
    </box>
  );
}
