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
  /** Handle of the default public channel's owner (OWNER_X_USERNAME). */
  ownerHandle: z.string().nullable(),
  /** True when the logged-in viewer is that owner. */
  viewerIsOwner: z.boolean(),
});

export type SessionPayload = z.infer<typeof sessionPayloadSchema>;

export const clipSchema = z.object({
  postId: z.string(),
  videoUrl: z.string(),
  text: z.string(),
  authorName: z.string(),
  authorUsername: z.string(),
  authorImage: z.string().optional(),
  postCreatedAt: z.string().optional(),
  score: z.number(),
  generatedAt: z.number(),
});

export type Clip = z.infer<typeof clipSchema>;

export const channelRequestSchema = z.object({
  /** Recently shown post ids the viewer doesn't want repeated back-to-back. */
  exclude: z.array(z.string()).max(32),
  /** True = the logged-in viewer's own feed; false = the owner channel. */
  personal: z.boolean(),
});

export const channelPayloadSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("fresh"), clip: clipSchema }),
  z.object({ kind: z.literal("rerun"), clip: clipSchema }),
  z.object({ kind: z.literal("off-air"), reason: z.string() }),
]);

export type ChannelPayload = z.infer<typeof channelPayloadSchema>;

/** An aired program plus whether its channel's owner pulled it off the air. */
export const programSchema = z.object({
  clip: clipSchema,
  hidden: z.boolean(),
});

export type Program = z.infer<typeof programSchema>;

export const programsPayloadSchema = z.object({
  programs: z.array(programSchema),
  /** False for a viewer who may look but not change what airs. */
  editable: z.boolean(),
});

export type ProgramsPayload = z.infer<typeof programsPayloadSchema>;

export const hideRequestSchema = z.object({
  postId: z.string(),
  personal: z.boolean(),
  hidden: z.boolean(),
});

export const errorPayloadSchema = z.object({
  error: z.string(),
});

export type ErrorPayload = z.infer<typeof errorPayloadSchema>;
