import * as z from "zod/mini";

const envSchema = z.object({
  TURSO_AUTH_TOKEN: z.optional(z.string()),
  TURSO_DATABASE_URL: z.string().check(z.minLength(1)),
});

export const env = envSchema.parse(process.env);
