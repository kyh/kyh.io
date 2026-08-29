import { z } from "zod";

// Payloads exchanged between the API routes and the client. Routes build
// these objects; the client re-parses responses through the same schemas, so
// both sides agree on one contract.

export const userSummarySchema = z.object({
  name: z.string(),
  username: z.string(),
  profileImageUrl: z.string().optional(),
});

export type UserSummary = z.infer<typeof userSummarySchema>;

export const sessionPayloadSchema = z.object({
  /** Env keys still unset, for the setup checklist. Empty when configured. */
  missingKeys: z.array(z.string()),
  user: userSummarySchema.nullable(),
});

export type SessionPayload = z.infer<typeof sessionPayloadSchema>;

export const feedPostSchema = z.object({
  id: z.string(),
  text: z.string(),
  createdAt: z.string().optional(),
  author: userSummarySchema,
});

export type FeedPostPayload = z.infer<typeof feedPostSchema>;

export const feedPayloadSchema = z.object({
  source: z.enum(["home", "own"]),
  posts: z.array(feedPostSchema),
});

export type FeedPayload = z.infer<typeof feedPayloadSchema>;

export const generateRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(2000),
});

export const generatePayloadSchema = z.object({
  status: z.enum(["queued", "generating", "done"]),
  requestId: z.string(),
  queuePosition: z.number().optional(),
  videoUrl: z.string().optional(),
});

export type GeneratePayload = z.infer<typeof generatePayloadSchema>;

export const errorPayloadSchema = z.object({
  error: z.string(),
});

export type ErrorPayload = z.infer<typeof errorPayloadSchema>;
