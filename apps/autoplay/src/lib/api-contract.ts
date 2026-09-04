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

/**
 * One channel in a viewer's lineup. CH 01 is always the public owner channel.
 * "live" means this viewer's watching runs a session — it is their source;
 * "replay" means they watch what was recorded while its owner was on.
 */
export const channelSummarySchema = z.object({
  number: z.number().int().positive(),
  sourceId: z.string(),
  kind: sourceKindSchema,
  label: z.string(),
  mode: z.enum(["live", "replay"]),
});

export type ChannelSummary = z.infer<typeof channelSummarySchema>;

/** What a viewer can watch when the station cannot even be reached. */
export const PUBLIC_CHANNEL: ChannelSummary = {
  number: 1,
  sourceId: "owner",
  kind: "x",
  label: "public access",
  mode: "replay",
};

export const sessionPayloadSchema = z.object({
  /** Env keys still unset, for the setup checklist. Empty when configured. */
  missingKeys: z.array(z.string()),
  user: userSummarySchema.nullable(),
  /** The viewer's lineup, CH 01 first. Anonymous viewers get CH 01 alone. */
  channels: z.array(channelSummarySchema).min(1),
  /** Whether connecting Google can work: the Google OAuth app is configured. */
  googleReady: z.boolean(),
  /** Whether anything can air: fal is configured. */
  liveReady: z.boolean(),
  /** Whether the public channel records while live: Vercel Blob is configured. */
  recordReady: z.boolean(),
});

export type SessionPayload = z.infer<typeof sessionPayloadSchema>;

/** What a program is made of: the item on air and the segment prompt that directs it. */
export const liveProgramSchema = z.object({
  itemId: z.string(),
  kind: sourceKindSchema,
  text: z.string(),
  authorName: z.string(),
  authorUsername: z.string(),
  prompt: z.string(),
});

export type LiveProgram = z.infer<typeof liveProgramSchema>;

export const liveRequestSchema = z.object({
  sourceId: z.string(),
  /** True for the program a session opens on, which comes with the world to open it in. */
  opening: z.boolean(),
});

export const livePayloadSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("program"),
    program: liveProgramSchema,
    /** The format's world prompt, only with an opening program. */
    world: z.string().optional(),
    formatLabel: z.string().optional(),
  }),
  z.object({ kind: z.literal("off-air"), reason: z.string() }),
]);

export type LivePayload = z.infer<typeof livePayloadSchema>;

/** A recorded segment of a channel's stream, as a replay plays it. */
export const recordingSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  kind: sourceKindSchema,
  url: z.string(),
  formatLabel: z.string(),
  text: z.string(),
  authorName: z.string(),
  authorUsername: z.string(),
  seconds: z.number(),
  recordedAt: z.number(),
});

export type Recording = z.infer<typeof recordingSchema>;

export const replayPayloadSchema = z.object({
  /** Newest first. */
  recordings: z.array(recordingSchema),
});

export type ReplayPayload = z.infer<typeof replayPayloadSchema>;

/** What the browser tells the station about a segment it just uploaded. */
export const recordingRequestSchema = z.object({
  sourceId: z.string(),
  itemId: z.string(),
  url: z.url(),
  formatLabel: z.string().max(80),
  text: z.string().max(4000),
  authorName: z.string().max(200),
  authorUsername: z.string().max(200),
  seconds: z.number().positive().max(60),
  bytes: z.number().int().nonnegative(),
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
