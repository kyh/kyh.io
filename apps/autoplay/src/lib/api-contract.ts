import { z } from "zod";

import { OWNER_SOURCE_ID, sourceKindSchema } from "@/lib/source-kinds";

// Payloads exchanged between the API routes and the client. Routes build
// these objects; the client re-parses responses through the same schemas, so
// both sides agree on one contract.

/** The model every channel streams through: what the client opens, and the only endpoint the proxy admits. */
export const DIRECTOR_MODEL = "minimax/h3-max/director";

const userSummarySchema = z.object({
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
const channelSummarySchema = z.object({
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
  sourceId: OWNER_SOURCE_ID,
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
  /** Whether signing in can work: the X app, a secret and the database are configured. */
  loginReady: z.boolean(),
  /** Whether connecting Google can work: the Google OAuth app is configured. */
  googleReady: z.boolean(),
  /** Whether anything can air: fal is configured. */
  liveReady: z.boolean(),
  /** Whether the public channel records while live: Vercel Blob is configured. */
  recordReady: z.boolean(),
});

export type SessionPayload = z.infer<typeof sessionPayloadSchema>;

/** The item on air, as the ticker reads it and the record keeps it. */
const programFieldsSchema = z.object({
  itemId: z.string(),
  kind: sourceKindSchema,
  text: z.string(),
  authorName: z.string(),
  authorUsername: z.string(),
});

/** What a program is made of: the item on air and the prompt that directs it. */
const liveProgramSchema = programFieldsSchema.extend({ prompt: z.string() });

export type LiveProgram = z.infer<typeof liveProgramSchema>;

export const liveRequestSchema = z.object({
  sourceId: z.string(),
  /** True for the program a session opens on, whose prompt then begins with the world. */
  opening: z.boolean(),
});

export const livePayloadSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("program"),
    program: liveProgramSchema,
    /** The format the session opens in, only with an opening program. */
    formatLabel: z.string().optional(),
  }),
  z.object({ kind: z.literal("off-air"), reason: z.string() }),
]);

export type LivePayload = z.infer<typeof livePayloadSchema>;

/** One chunk of a recorded session, as a replay appends it. */
const recordingChunkSchema = programFieldsSchema.extend({
  index: z.number().int().nonnegative(),
  url: z.string(),
  seconds: z.number(),
});

export type RecordingChunk = z.infer<typeof recordingChunkSchema>;

/** One live session as recorded: its chunks in order, which play as one stream. */
const recordedSessionSchema = z.object({
  sessionId: z.string(),
  formatLabel: z.string(),
  /** Unix ms of the first chunk. */
  startedAt: z.number(),
  /** Unix ms of the newest chunk; a session still receiving chunks is on air. */
  updatedAt: z.number(),
  chunks: z.array(recordingChunkSchema).min(1),
});

export type RecordedSession = z.infer<typeof recordedSessionSchema>;

export const replayPayloadSchema = z.object({
  /** Newest session first. */
  sessions: z.array(recordedSessionSchema),
});

export type ReplayPayload = z.infer<typeof replayPayloadSchema>;

/** What the browser tells the station about a chunk it just uploaded — bounded, since it is written down. */
export const recordingRequestSchema = recordingChunkSchema.extend({
  sourceId: z.string(),
  sessionId: z.string().max(80),
  url: z.url(),
  formatLabel: z.string().max(80),
  itemId: z.string().max(200),
  text: z.string().max(4000),
  authorName: z.string().max(200),
  authorUsername: z.string().max(200),
  seconds: z.number().positive().max(60),
  bytes: z.number().int().nonnegative(),
});

export type RecordingRequest = z.infer<typeof recordingRequestSchema>;

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

export const inviteRequestSchema = z.object({
  code: z.string().min(1).max(100),
});

/** What a route answers when there is nothing to say but that it worked. */
export const okPayloadSchema = z.object({ ok: z.literal(true) });

export const errorPayloadSchema = z.object({
  error: z.string(),
});

export type ErrorPayload = z.infer<typeof errorPayloadSchema>;

/** A route's answer as the client reads it: the payload, or the station's error. */
export type Answer<T> = { data: T } | { error: string };

export const jsonRequest = <Body extends object>(
  method: "POST" | "DELETE" | "PATCH",
  body: Body,
): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

/**
 * A route's answer, parsed: the payload through `schema`, or the error the
 * station gave — `fallback` when it gave none a viewer could read.
 */
export const requestJson = async <T>(
  input: string,
  schema: z.ZodType<T>,
  fallback: string,
  init?: RequestInit,
): Promise<Answer<T>> => {
  try {
    const response = await fetch(input, init);
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const failure = errorPayloadSchema.safeParse(body);
      return { error: failure.success ? failure.data.error : fallback };
    }
    const payload = schema.safeParse(body);
    return payload.success ? { data: payload.data } : { error: fallback };
  } catch {
    return { error: fallback };
  }
};
