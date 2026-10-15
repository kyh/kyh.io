import * as z from "zod/mini";

const envSchema = z.object({
  /** Optional: a local `file:` database needs none. */
  TURSO_AUTH_TOKEN: z.optional(z.string()),
  /** The leaderboard's own Turso database, or `file:local.db` in dev. */
  TURSO_DATABASE_URL: z.string().check(z.minLength(1)),
});

export const env = envSchema.parse(process.env);
