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
  SESSION_SECRET: optionalKey,
  FAL_KEY: optionalKey,
  FAL_VIDEO_MODEL: optionalKey,
  APP_URL: optionalKey,
  /** X handle whose feed powers the default public channel. */
  OWNER_X_USERNAME: optionalKey,
  /** Upstash-compatible Redis REST endpoint (Vercel KV spelling). */
  KV_REST_API_URL: optionalKey,
  KV_REST_API_TOKEN: optionalKey,
  /** Same store, Upstash's own spelling. */
  UPSTASH_REDIS_REST_URL: optionalKey,
  UPSTASH_REDIS_REST_TOKEN: optionalKey,
});

export const env = envSchema.parse(process.env);

export const DEFAULT_VIDEO_MODEL = "minimax/h3-max/text-to-video";

export const videoModel = env.FAL_VIDEO_MODEL ?? DEFAULT_VIDEO_MODEL;

export type KvConfig = {
  url: string;
  token: string;
};

/** The clip archive's Redis REST endpoint, under either env spelling. */
export const kvConfig = (): KvConfig | undefined => {
  const url = env.KV_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN;
  if (url === undefined || token === undefined) return undefined;
  return { url, token };
};

/** Keys still unset, in the order the setup checklist should list them. */
export const missingEnvKeys = (): string[] => {
  const missing: string[] = [];
  if (env.X_CLIENT_ID === undefined) missing.push("X_CLIENT_ID");
  if (env.X_CLIENT_SECRET === undefined) missing.push("X_CLIENT_SECRET");
  if (env.SESSION_SECRET === undefined) missing.push("SESSION_SECRET");
  if (env.FAL_KEY === undefined) missing.push("FAL_KEY");
  if (env.OWNER_X_USERNAME === undefined) missing.push("OWNER_X_USERNAME");
  if (kvConfig() === undefined) missing.push("KV_REST_API_URL", "KV_REST_API_TOKEN");
  return missing;
};
