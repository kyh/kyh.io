import { z } from "zod";

// Every key an operator has to supply. All optional: a missing key disables
// its feature (login, video generation, the shared archive) and the UI shows
// what's missing instead of the app crashing at boot. `.env.example`
// documents each key.
const optionalKey = z
  .string()
  .optional()
  .transform((value) => (value !== undefined && value.trim() !== "" ? value : undefined));

const envSchema = z.object({
  X_CLIENT_ID: optionalKey,
  X_CLIENT_SECRET: optionalKey,
  /** Google OAuth app, for the Gmail and YouTube sources. Optional: without it those can't be connected. */
  GOOGLE_CLIENT_ID: optionalKey,
  GOOGLE_CLIENT_SECRET: optionalKey,
  BETTER_AUTH_SECRET: optionalKey,
  /** fal.ai, for the director model every channel streams through. */
  FAL_KEY: optionalKey,
  APP_URL: optionalKey,
  /** X handle whose feed powers the default public channel. */
  OWNER_X_USERNAME: optionalKey,
  /** The clip archive's Turso database (autoplay's own, not policingice's). */
  TURSO_DATABASE_URL: optionalKey,
  TURSO_AUTH_TOKEN: optionalKey,
});

export const env = envSchema.parse(process.env);

export const googleConfigured =
  env.GOOGLE_CLIENT_ID !== undefined && env.GOOGLE_CLIENT_SECRET !== undefined;

/** Keys still unset, in the order the setup checklist should list them. */
export const missingEnvKeys = (): string[] => {
  const missing: string[] = [];
  if (env.X_CLIENT_ID === undefined) missing.push("X_CLIENT_ID");
  if (env.X_CLIENT_SECRET === undefined) missing.push("X_CLIENT_SECRET");
  if (env.BETTER_AUTH_SECRET === undefined) missing.push("BETTER_AUTH_SECRET");
  if (env.FAL_KEY === undefined) missing.push("FAL_KEY");
  if (env.OWNER_X_USERNAME === undefined) missing.push("OWNER_X_USERNAME");
  if (env.TURSO_DATABASE_URL === undefined) missing.push("TURSO_DATABASE_URL");
  return missing;
};
