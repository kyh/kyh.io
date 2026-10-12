// A run as the mod posts it: who played, and what the run came to when
// Claude went quiet. Anyone can post, so every number is bounded.
import * as z from "zod/mini";

const count = (min: number, max: number) => z.int().check(z.minimum(min), z.maximum(max));

// The most a run can write per second it lasted, with parallel subagents, and
// a head start for a first reply that lands before a second has passed.
export const MAX_TOKENS_PER_SECOND = 500;
export const TOKEN_HEAD_START = 4000;

export const runSchema = z
  .object({
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
  })
  .check(
    z.refine(
      (posted) => posted.tokens <= posted.seconds * MAX_TOKENS_PER_SECOND + TOKEN_HEAD_START,
      { message: "more tokens than a run that long could write", path: ["tokens"] },
    ),
  );

export type Run = z.infer<typeof runSchema>;
