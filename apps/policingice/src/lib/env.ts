import { z } from "zod";

const databaseUrl = z
  .string()
  .optional()
  .transform((value) => (value !== undefined && URL.canParse(value) ? value : undefined));

const envSchema = z.object({
  AI_GATEWAY_API_KEY: z.string().optional(),
  BETTER_AUTH_SECRET: z.string().optional(),
  TURSO_AUTH_TOKEN: z.string().optional(),
  TURSO_DATABASE_URL: databaseUrl,
  XAI_API_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);

export const databaseConfigured = env.TURSO_DATABASE_URL !== undefined;

/** The production database's URL; throws while `TURSO_DATABASE_URL` is unset or not a URL. */
export const requireDatabaseUrl = () => {
  if (env.TURSO_DATABASE_URL === undefined) {
    throw new Error(
      "TURSO_DATABASE_URL is unset or not a URL. policingice has no local database: set it to the Turso URL.",
    );
  }

  return env.TURSO_DATABASE_URL;
};
