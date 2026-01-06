import { createCliRenderer } from "@opentui/core";
import { createRoot, useKeyboard } from "@opentui/react";
import { useState } from "react";
import { name, heroText, projects, work, contact } from "./data/content";
import { openUrl, wrapText } from "./lib/utils";

const TITLE_WIDTH = 32;
const PREFIX_WIDTH = 2;
const DESC_INDENT = PREFIX_WIDTH + TITLE_WIDTH;
const DIM = "#666666";
const HIGHLIGHT = "#00FFFF";

const allItems = [...projects, ...work];

// Clear screen and hide cursor
process.stdout.write("\x1b[2J\x1b[H\x1b[?25l");
process.on("exit", () => process.stdout.write("\x1b[?25h\x1b[2J\x1b[H"));

function App() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showContact, setShowContact] = useState(false);
  const termWidth = process.stdout.columns || 80;
  const contentWidth = termWidth - 4;
  const descWidth = contentWidth - DESC_INDENT;

  useKeyboard((key) => {
    if (showContact) {
      if (key.name === "escape" || key.name === "c") {
        setShowContact(false);
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

      {showContact && (() => {
        const modalWidth = 32;
        const labelWidth = 10;
        const valueWidth = modalWidth - labelWidth - 4;
        const row = (label: string, value: string) => (
          <box flexDirection="row">
            <text>{"█".repeat(2)}</text>
            <text fg={HIGHLIGHT}>{label.padEnd(labelWidth)}</text>
            <text>{value.padEnd(valueWidth)}</text>
            <text>{"█".repeat(2)}</text>
          </box>
        );
        return (
          <box
            position="absolute"
            flexDirection="column"
            top={0}
            left={0}
            right={0}
            bottom={0}
            justifyContent="center"
            alignItems="center"
          >
            <box flexDirection="column">
              <text>{"█".repeat(modalWidth)}</text>
              <text>{"█".repeat(2)}{"Contact".padEnd(modalWidth - 4)}{"█".repeat(2)}</text>
              <text>{"█".repeat(modalWidth)}</text>
              {row("Website", contact.website)}
              {row("GitHub", contact.github)}
              {row("X", contact.x)}
              {row("LinkedIn", contact.linkedin)}
              {row("Email", contact.email)}
              <text>{"█".repeat(modalWidth)}</text>
              <box flexDirection="row">
                <text>{"█".repeat(2)}</text>
                <text fg={DIM}>{"esc close".padEnd(modalWidth - 4)}</text>
                <text>{"█".repeat(2)}</text>
              </box>
              <text>{"█".repeat(modalWidth)}</text>
            </box>
          </box>
        );
      })()}
    </box>
  );
}

const renderer = await createCliRenderer();
createRoot(renderer).render(<App />);
