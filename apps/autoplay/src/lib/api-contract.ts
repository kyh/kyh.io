import { z } from "zod";

import { SOURCE_KINDS } from "@/lib/source-kinds";

// Payloads exchanged between the API routes and the client. Routes build
// these objects; the client re-parses responses through the same schemas, so
// both sides agree on one contract.

export const sourceKindSchema = z.enum(SOURCE_KINDS);

export const userSummarySchema = z.object({
  name: z.string(),
  username: z.string(),
  profileImageUrl: z.string().optional(),
});

export type UserSummary = z.infer<typeof userSummarySchema>;

/** One channel in a viewer's lineup. CH 01 is always the public owner channel. */
export const channelSummarySchema = z.object({
  number: z.number().int().positive(),
  sourceId: z.string(),
  kind: sourceKindSchema,
  label: z.string(),
  /** True when the viewer may change what airs: their own source, or the owner on CH 01. */
  editable: z.boolean(),
});

export type ChannelSummary = z.infer<typeof channelSummarySchema>;

/** What a viewer can watch when the station cannot even be reached. */
export const PUBLIC_CHANNEL: ChannelSummary = {
  number: 1,
  sourceId: "owner",
  kind: "x",
  label: "public access",
  editable: false,
};

export const sessionPayloadSchema = z.object({
  /** Env keys still unset, for the setup checklist. Empty when configured. */
  missingKeys: z.array(z.string()),
  user: userSummarySchema.nullable(),
  /** The viewer's lineup, CH 01 first. Anonymous viewers get CH 01 alone. */
  channels: z.array(channelSummarySchema).min(1),
  /** Whether connecting Google can work: the Google OAuth app is configured. */
  googleReady: z.boolean(),
});

export type SessionPayload = z.infer<typeof sessionPayloadSchema>;

export const clipSchema = z.object({
  /** `{kind}:{id inside the source}`. */
  itemId: z.string(),
  kind: sourceKindSchema,
  videoUrl: z.string(),
  text: z.string(),
  authorName: z.string(),
  /** An X handle, a sender address, a feed host, a channel name. */
  authorUsername: z.string(),
  authorImage: z.string().optional(),
  itemCreatedAt: z.string().optional(),
  score: z.number(),
  generatedAt: z.number(),
});

export type Clip = z.infer<typeof clipSchema>;

export const channelRequestSchema = z.object({
  sourceId: z.string(),
  /** Recently shown item ids the viewer doesn't want repeated back-to-back. */
  exclude: z.array(z.string()).max(32),
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
  sourceId: z.string(),
  itemId: z.string(),
  hidden: z.boolean(),
});

/** Sources with a grant behind them are created from the grant; only a feed is added by hand. */
export const addSourceRequestSchema = z.object({
  kind: z.literal("rss"),
  url: z.url(),
});

export const removeSourceRequestSchema = z.object({
  sourceId: z.string(),
});

export const reorderSourcesRequestSchema = z.object({
  /** Source ids in the order they should air, CH 02 onwards. */
  order: z.array(z.string()).max(64),
});

/** What every change to the lineup answers with: the lineup. */
export const channelsPayloadSchema = z.object({
  channels: z.array(channelSummarySchema).min(1),
});

export type ChannelsPayload = z.infer<typeof channelsPayloadSchema>;

export const errorPayloadSchema = z.object({
  error: z.string(),
});

export type ErrorPayload = z.infer<typeof errorPayloadSchema>;
