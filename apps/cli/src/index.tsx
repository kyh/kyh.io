import { createCliRenderer } from "@opentui/core";
import { createRoot, useKeyboard, useTerminalDimensions } from "@opentui/react";
import { useState } from "react";
import { name, heroText, projects, work, contactLinks } from "./data/content";
import { openUrl, wrapText } from "./lib/utils";

const TITLE_WIDTH = 32;
const PREFIX_WIDTH = 2;
const DESC_INDENT = PREFIX_WIDTH + TITLE_WIDTH;
const LABEL_WIDTH = 10;
const DIM = "#666666";
const HIGHLIGHT = "#00FFFF";

const allItems = [...projects, ...work];

// Clear screen and hide cursor
process.stdout.write("\x1b[2J\x1b[H\x1b[?25l");
process.on("exit", () => process.stdout.write("\x1b[?25h\x1b[2J\x1b[H"));

function App() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showContact, setShowContact] = useState(false);
  const [contactIndex, setContactIndex] = useState(0);
  const { width: termWidth } = useTerminalDimensions();
  const contentWidth = termWidth - 4;
  const descWidth = contentWidth - DESC_INDENT;

  useKeyboard((key) => {
    if (showContact) {
      switch (key.name) {
        case "up":
        case "k":
          setContactIndex((i) => (i > 0 ? i - 1 : contactLinks.length - 1));
          break;
        case "down":
        case "j":
          setContactIndex((i) => (i < contactLinks.length - 1 ? i + 1 : 0));
          break;
        case "return":
          openUrl(contactLinks[contactIndex]!.url);
          break;
        case "escape":
        case "c":
          setShowContact(false);
          setContactIndex(0);
          break;
      }
      return;
    }

    switch (key.name) {
      case "up":
      case "k":
        setSelectedIndex((i) => (i > 0 ? i - 1 : allItems.length - 1));
        break;
      case "down":
      case "j":
        setSelectedIndex((i) => (i < allItems.length - 1 ? i + 1 : 0));
        break;
      case "return":
        openUrl(allItems[selectedIndex]!.url);
        break;
      case "c":
        setShowContact(true);
        break;
      case "escape":
      case "q":
        process.exit(0);
        break;
    }
  });

  const heroLines = wrapText(heroText, contentWidth);
  const divider = "─".repeat(contentWidth);

  const renderItem = (item: typeof allItems[0], index: number, isFirst: boolean) => {
    const isSelected = index === selectedIndex;
    const prefix = isSelected ? "> " : "  ";
    const title = item.title.padEnd(TITLE_WIDTH);
    const descLines = wrapText(item.description, descWidth);

    return (
      <box key={item.title} flexDirection="column">
        {!isFirst && <text fg={DIM}>{divider}</text>}
        <text fg={isSelected ? undefined : DIM}>
          {prefix}{title}{descLines[0]}
        </text>
        {descLines.slice(1).map((line, i) => (
          <text key={i} fg={isSelected ? undefined : DIM}>
            {" ".repeat(DESC_INDENT)}{line}
          </text>
        ))}
      </box>
    );
  };

  if (showContact) {
    return (
      <box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
        <box flexDirection="column">
          <text>Contact</text>
          <text> </text>
          {contactLinks.map((link, i) => {
            const isSelected = i === contactIndex;
            const prefix = isSelected ? "> " : "  ";
            return (
              <box key={link.label} flexDirection="row">
                <text>{prefix}</text>
                <text fg={HIGHLIGHT}>{link.label.padEnd(LABEL_WIDTH)}</text>
                <text fg={isSelected ? undefined : DIM}>{link.value}</text>
              </box>
            );
          })}
          <text> </text>
          <text fg={DIM}>↑↓ navigate  enter open  esc close</text>
        </box>
      </box>
    );
  }

  return (
    <box flexDirection="column" paddingLeft={2} paddingTop={1} flexGrow={1}>
      <box flexDirection="column" flexGrow={1}>
        <text>{name}</text>
        <text> </text>
        {heroLines.map((line, i) => (
          <text key={i} fg={DIM}>{line}</text>
        ))}
        <text> </text>
        <text>Projects</text>
        <text> </text>
        {projects.map((project, i) => renderItem(project, i, i === 0))}
        <text> </text>
        <text>Work</text>
        <text> </text>
        {work.map((item, i) => renderItem(item, projects.length + i, i === 0))}
      </box>
      <text fg={DIM}>↑↓ navigate  enter open  c contact  q quit</text>
    </box>
  );
}

const renderer = await createCliRenderer();
createRoot(renderer).render(<App />);
