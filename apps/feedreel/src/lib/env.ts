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
  BETTER_AUTH_SECRET: optionalKey,
  FAL_KEY: optionalKey,
  FAL_VIDEO_MODEL: optionalKey,
  APP_URL: optionalKey,
  /** X handle whose feed powers the default public channel. */
  OWNER_X_USERNAME: optionalKey,
  /** The clip archive's Turso database (feedreel's own, not policingice's). */
  TURSO_DATABASE_URL: optionalKey,
  TURSO_AUTH_TOKEN: optionalKey,
});

export const env = envSchema.parse(process.env);

export const DEFAULT_VIDEO_MODEL = "minimax/h3-max/text-to-video";

export const videoModel = env.FAL_VIDEO_MODEL ?? DEFAULT_VIDEO_MODEL;

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
