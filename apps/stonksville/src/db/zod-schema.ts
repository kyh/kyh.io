import { z } from "zod";

/** Revenue treemap puzzle mode */
export const revenueTreemapDataSchema = z.object({
  segments: z.array(
    z.object({
      label: z.string(),
      value: z.number(),
    }),
  ),
});

/** Discriminated union for all puzzle types */
export const puzzleDataSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("revenue_treemap"),
    data: revenueTreemapDataSchema,
  }),
]);

export type PuzzleDataPayload = z.infer<typeof puzzleDataSchema>;
export type RevenueTreemapData = z.infer<typeof revenueTreemapDataSchema>;

/** Guess distribution stored as JSON in userStats */
export const guessDistributionSchema = z.record(
  z.enum(["1", "2", "3", "4", "5", "6"]),
  z.number().int().nonnegative(),
);

export type GuessDistribution = z.infer<typeof guessDistributionSchema>;

/** Direction hint for a numeric comparison */
const directionSchema = z.enum(["higher", "lower", "correct"]);
export type Direction = z.infer<typeof directionSchema>;

/** Feedback returned for a single guess */
export const guessFeedbackSchema = z.object({
  guessedCompanyId: z.string(),
  guessedTicker: z.string().nullable(),
  guessedName: z.string(),
  sectorMatch: z.boolean(),
  marketCapDirection: directionSchema,
  employeeDirection: directionSchema,
  ipoYearDirection: directionSchema,
  isCorrect: z.boolean(),
});

export type GuessFeedback = z.infer<typeof guessFeedbackSchema>;
