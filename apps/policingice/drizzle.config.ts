import { defineConfig } from "drizzle-kit";

import { env, requireDatabaseUrl } from "./src/lib/env";

export default defineConfig({
  dbCredentials: {
    authToken: env.TURSO_AUTH_TOKEN,
    url: requireDatabaseUrl(),
  },
  dialect: "turso",
  out: "./drizzle",
  schema: "./src/db/drizzle-schema.ts",
});
