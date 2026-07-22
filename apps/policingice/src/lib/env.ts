import { z } from "zod";

// Every key an operator has to supply. Platform runtime vars (VERCEL_*, NODE_ENV)
// are deliberately absent — they are not app configuration.
//
// Only the database URL is required: without it there is nothing to serve, and a
// blank client fails later with an opaque libsql error instead of here. The rest
// are optional so a missing key disables its feature (AI enrichment, embeddings)
// rather than crashing boot.
const envSchema = z.object({
  TURSO_DATABASE_URL: z.string().min(1),
  TURSO_AUTH_TOKEN: z.string().optional(),
  BETTER_AUTH_SECRET: z.string().optional(),
  AI_GATEWAY_API_KEY: z.string().optional(),
  XAI_API_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
