import { createCliRenderer } from "@opentui/core";
import { createRoot, useKeyboard } from "@opentui/react";
import { useState } from "react";
import { name, heroText, projects } from "./data/content";
import { openUrl, wrapText } from "./lib/utils";

const TITLE_WIDTH = 32;
const PREFIX_WIDTH = 2;
const DESC_INDENT = PREFIX_WIDTH + TITLE_WIDTH;
const DIM = "#666666";

// Clear screen and hide cursor
process.stdout.write("\x1b[2J\x1b[H\x1b[?25l");
process.on("exit", () => process.stdout.write("\x1b[?25h\x1b[2J\x1b[H"));

function App() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const termWidth = process.stdout.columns || 80;
  const contentWidth = termWidth - 4; // account for padding
  const descWidth = contentWidth - DESC_INDENT;

  useKeyboard((key) => {
    switch (key.name) {
      case "up":
      case "k":
        setSelectedIndex((i) => (i > 0 ? i - 1 : projects.length - 1));
        break;
      case "down":
      case "j":
        setSelectedIndex((i) => (i < projects.length - 1 ? i + 1 : 0));
        break;
      case "return":
        openUrl(projects[selectedIndex]!.url);
        break;
      case "escape":
      case "q":
        process.exit(0);
        break;
    }
  });

  const heroLines = wrapText(heroText, contentWidth);
  const divider = "─".repeat(contentWidth);

  return (
    <box flexDirection="column" paddingLeft={2} paddingTop={1}>
      <text>{name}</text>
      <text> </text>
      {heroLines.map((line, i) => (
        <text key={i} fg={DIM}>{line}</text>
      ))}
      <text> </text>
      {projects.map((project, index) => {
        const isSelected = index === selectedIndex;
        const prefix = isSelected ? "> " : "  ";
        const title = project.title.padEnd(TITLE_WIDTH);
        const descLines = wrapText(project.description, descWidth);

        return (
          <box key={project.title} flexDirection="column">
            {index > 0 && <text fg={DIM}>{divider}</text>}
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
      })}
    </box>
  );
}

const renderer = await createCliRenderer();
createRoot(renderer).render(<App />);
