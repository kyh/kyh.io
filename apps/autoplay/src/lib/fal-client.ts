"use client";

import { createFalClient } from "@fal-ai/client";

export const fal = createFalClient({ proxyUrl: "/api/fal/proxy" });
