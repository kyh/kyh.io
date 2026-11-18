import { z } from "zod";

const envSchema = z.object({
  AI_GATEWAY_API_KEY: z.string().optional(),
  BETTER_AUTH_SECRET: z.string().optional(),
  TURSO_AUTH_TOKEN: z.string().optional(),
  TURSO_DATABASE_URL: z.string().min(1),
  XAI_API_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
