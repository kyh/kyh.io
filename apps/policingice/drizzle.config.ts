import { defineConfig } from "drizzle-kit";

import { env } from "./src/lib/env";

export default defineConfig({
  dbCredentials: {
    authToken: env.TURSO_AUTH_TOKEN,
    url: env.TURSO_DATABASE_URL,
  },
  dialect: "turso",
  out: "./drizzle",
  schema: "./src/db/drizzle-schema.ts",
});
