import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { useState } from "react";
import { Menu } from "./components/menu";
import { Projects } from "./components/projects";
import { About } from "./components/about";
import { Contact } from "./components/contact";
import { Card } from "./components/card";
import { ansi, nameArt } from "./lib/theme";
import type { View } from "./lib/types";

// Parse CLI arguments
const args = process.argv.slice(2);
const showCard = args.includes("--card") || args.includes("-c");
const isInteractive = !args.some(a => ["--card", "-c", "--ascii", "--help", "-h"].includes(a));

// Clear screen and hide cursor immediately for interactive mode
if (isInteractive) {
  process.stdout.write(`${ansi.clearScreen}${ansi.cursorHome}${ansi.hideCursor}`);
  process.on("exit", () => process.stdout.write(`${ansi.showCursor}${ansi.clearScreen}${ansi.cursorHome}`));
}

// Handle --ascii flag
if (args.includes("--ascii")) {
  console.log(nameArt);
  process.exit(0);
}

// Handle --help flag
if (args.includes("--help") || args.includes("-h")) {
  console.log(`
kyh - Interactive about me CLI

Usage:
  kyh                    Interactive mode
  kyh --card, -c         Quick business card
  kyh --ascii            ASCII art name
  kyh --help, -h         Show this help

Navigation:
  ↑/↓ or j/k             Navigate menus
  ←/→ or h/l             Browse projects
  Enter                  Select / Open URL
  Esc or q               Back / Quit
`);
  process.exit(0);
}

function App() {
  const [currentView, setCurrentView] = useState<View>("menu");
  const goBack = () => setCurrentView("menu");

  switch (currentView) {
    case "projects":
      return <Projects onBack={goBack} />;
    case "about":
      return <About onBack={goBack} />;
    case "contact":
      return <Contact onBack={goBack} />;
    default:
      return <Menu onSelect={setCurrentView} />;
  }
}

const renderer = await createCliRenderer();
const root = createRoot(renderer);

if (showCard) {
  root.render(<Card />);
  setTimeout(() => process.exit(0), 50);
} else {
  root.render(<App />);
}
