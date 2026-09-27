import { z } from "zod";

// Every key an operator has to supply. All optional: a missing key disables
// its feature (login, the stream, the replay, Google sources) and the UI shows
// what's missing instead of the app crashing at boot. `.env.example`
// documents each key.
const optionalKey = z
  .string()
  .optional()
  .transform((value) => (value !== undefined && value.trim() !== "" ? value : undefined));

const envSchema = z.object({
  APP_URL: optionalKey,
  BETTER_AUTH_SECRET: optionalKey,
  /** Vercel Blob, where the public channel's recordings go. Optional: without it there is no replay. */
  BLOB_READ_WRITE_TOKEN: optionalKey,
  /** fal.ai, for the director model every channel streams through. */
  FAL_KEY: optionalKey,
  /** Google OAuth app, for the Gmail and YouTube sources. Optional: without it those can't be connected. */
  GOOGLE_CLIENT_ID: optionalKey,
  GOOGLE_CLIENT_SECRET: optionalKey,
  /** Set once Google has verified the app; until then Gmail and YouTube connect for the owner alone. */
  GOOGLE_OPEN_TO_ALL: optionalKey,
  /** X handle whose feed powers the default public channel. */
  OWNER_X_USERNAME: optionalKey,
  TURSO_AUTH_TOKEN: optionalKey,
  /** Turso database (autoplay's own, not policingice's): users, grants, lineup, what aired, recordings. */
  TURSO_DATABASE_URL: optionalKey,
  /** Set by Vercel; where the OAuth redirect comes home to when APP_URL is not given. */
  VERCEL_ENV: optionalKey,
  VERCEL_PROJECT_PRODUCTION_URL: optionalKey,
  VERCEL_URL: optionalKey,
  X_CLIENT_ID: optionalKey,
  X_CLIENT_SECRET: optionalKey,
});

export const env = envSchema.parse(process.env);

export const googleConfigured =
  env.GOOGLE_CLIENT_ID !== undefined && env.GOOGLE_CLIENT_SECRET !== undefined;

export const googleOpenToAll = env.GOOGLE_OPEN_TO_ALL !== undefined;

export const recordingConfigured = env.BLOB_READ_WRITE_TOKEN !== undefined;

/** Keys still unset, in the order the setup checklist should list them. */
export const missingEnvKeys = (): string[] => {
  const missing: string[] = [];
  if (env.X_CLIENT_ID === undefined) {
    missing.push("X_CLIENT_ID");
  }
  if (env.X_CLIENT_SECRET === undefined) {
    missing.push("X_CLIENT_SECRET");
  }
  if (env.BETTER_AUTH_SECRET === undefined) {
    missing.push("BETTER_AUTH_SECRET");
  }
  if (env.FAL_KEY === undefined) {
    missing.push("FAL_KEY");
  }
  if (env.OWNER_X_USERNAME === undefined) {
    missing.push("OWNER_X_USERNAME");
  }
  if (env.TURSO_DATABASE_URL === undefined) {
    missing.push("TURSO_DATABASE_URL");
  }
  return missing;
};
