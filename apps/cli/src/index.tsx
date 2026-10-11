import { render } from "ink";

import { App } from "./app";

const app = render(<App />, { alternateScreen: true, incrementalRendering: true });
await app.waitUntilExit();
