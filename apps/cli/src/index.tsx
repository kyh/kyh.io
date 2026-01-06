import { createCliRenderer } from "@opentui/core";
import { createRoot, useKeyboard } from "@opentui/react";
import { useState } from "react";
import { name, heroText, projects } from "./data/content";
import { openUrl, wrapText } from "./lib/utils";

const WIDTH = 60;
const TITLE_WIDTH = 18;
const DIM = "#666666";

// Clear screen and hide cursor
process.stdout.write("\x1b[2J\x1b[H\x1b[?25l");
process.on("exit", () => process.stdout.write("\x1b[?25h\x1b[2J\x1b[H"));

function App() {
  const [selectedIndex, setSelectedIndex] = useState(0);

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

  const heroLines = wrapText(heroText, WIDTH);

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
        return (
          <text key={project.title} fg={isSelected ? undefined : DIM}>
            {prefix}{title}{project.description}
          </text>
        );
      })}
    </box>
  );
}

const renderer = await createCliRenderer();
createRoot(renderer).render(<App />);
