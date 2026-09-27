import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";

import { App } from "./app";

// Clear screen and hide cursor while the terminal UI is mounted; restore on exit.
process.stdout.write("\u001B[2J\u001B[H\u001B[?25l");
process.on("exit", () => process.stdout.write("\u001B[?25h\u001B[2J\u001B[H"));

const renderer = await createCliRenderer();
createRoot(renderer).render(<App />);
