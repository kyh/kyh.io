import { defineConfig } from "drizzle-kit";

import { env } from "./src/lib/env";

// autoplay owns its Turso database (separate from policingice's) — pushing
// this schema with `pnpm -F @repo/autoplay db:push` is safe.
const url = env.TURSO_DATABASE_URL;
if (url === undefined) {
  throw new Error("TURSO_DATABASE_URL is required to run drizzle-kit — fill in .env first");
}

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/drizzle-schema.ts",
  dialect: "turso",
  dbCredentials: {
    url,
    authToken: env.TURSO_AUTH_TOKEN,
  },
});
