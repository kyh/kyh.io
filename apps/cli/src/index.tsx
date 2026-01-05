import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { useState } from "react";
import { Menu } from "./components/menu";
import { Projects } from "./components/projects";
import { About } from "./components/about";
import { Contact } from "./components/contact";
import { ansi } from "./lib/theme";
import type { View } from "./lib/types";

// Clear screen and hide cursor
process.stdout.write(`${ansi.clearScreen}${ansi.cursorHome}${ansi.hideCursor}`);
process.on("exit", () => process.stdout.write(`${ansi.showCursor}${ansi.clearScreen}${ansi.cursorHome}`));

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
createRoot(renderer).render(<App />);
