import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";

import { App } from "./app";

// Clear screen and hide cursor while the terminal UI is mounted; restore on exit.
process.stdout.write("\x1b[2J\x1b[H\x1b[?25l");
process.on("exit", () => process.stdout.write("\x1b[?25h\x1b[2J\x1b[H"));

const renderer = await createCliRenderer();
createRoot(renderer).render(<App />);
