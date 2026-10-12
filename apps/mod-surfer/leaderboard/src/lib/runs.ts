// A run as the mod posts it: who played, and what the run came to when
// Claude went quiet. Anyone can post, so every number is bounded.
import * as z from "zod/mini";

const count = (min: number, max: number) => z.int().check(z.minimum(min), z.maximum(max));

export const runSchema = z.object({
  coins: count(0, 1_000_000),
  name: z.pipe(
    z.pipe(
      z.string(),
      // oxlint-disable-next-line no-control-regex -- control characters are exactly what to strip
      z.transform((name) => name.replaceAll(/[\u0000-\u001F\u007F]/gu, "").trim()),
    ),
    z.string().check(z.minLength(1), z.maxLength(32)),
  ),
  seconds: count(0, 7 * 24 * 60 * 60),
  tokens: count(1, 50_000_000),
});

export type Run = z.infer<typeof runSchema>;
