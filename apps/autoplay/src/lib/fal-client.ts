"use client";

import { createFalClient } from "@fal-ai/client";

// The browser's fal client. Every request goes through /api/fal/proxy, which
// holds the key and admits only signed-in viewers and the director model.
export const fal = createFalClient({ proxyUrl: "/api/fal/proxy" });
