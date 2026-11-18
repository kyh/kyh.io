import { z } from "zod";

const optionalKey = z
  .string()
  .optional()
  .transform((value) => (value !== undefined && value.trim() !== "" ? value : undefined));

const envSchema = z.object({
  APP_URL: optionalKey,
  BETTER_AUTH_SECRET: optionalKey,
  BLOB_READ_WRITE_TOKEN: optionalKey,
  FAL_KEY: optionalKey,
  GOOGLE_CLIENT_ID: optionalKey,
  GOOGLE_CLIENT_SECRET: optionalKey,
  GOOGLE_OPEN_TO_ALL: optionalKey,
  OWNER_X_USERNAME: optionalKey,
  TURSO_AUTH_TOKEN: optionalKey,
  TURSO_DATABASE_URL: optionalKey,
  VERCEL_ENV: optionalKey,
  VERCEL_PROJECT_PRODUCTION_URL: optionalKey,
  VERCEL_URL: optionalKey,
  X_API_URL: optionalKey,
  X_CLIENT_ID: optionalKey,
  X_CLIENT_SECRET: optionalKey,
});

export const env = envSchema.parse(process.env);

export const googleConfigured =
  env.GOOGLE_CLIENT_ID !== undefined && env.GOOGLE_CLIENT_SECRET !== undefined;

export const googleOpenToAll = env.GOOGLE_OPEN_TO_ALL !== undefined;

export const recordingConfigured = env.BLOB_READ_WRITE_TOKEN !== undefined;

/** Keys still unset, in the order the setup checklist should list them. */
export const missingEnvKeys = () => {
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
