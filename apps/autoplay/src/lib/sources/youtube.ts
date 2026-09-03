import { z } from "zod";

import { bestOf, plainText } from "./types";
import type { AccessOf, Item } from "./types";

// YouTube as a source: recent uploads from the channels the account follows,
// most viewed first. The Data API has a 10 000-unit daily quota; a refresh
// here costs about MAX_CHANNELS + 3 units, and the hour-long cache keeps a
// watching owner from spending it per program.

const YT_BASE = "https://www.googleapis.com/youtube/v3";
const MAX_CHANNELS = 20;
const UPLOADS_PER_CHANNEL = 3;
/** An old viral upload must not win forever; only this window competes. */
const RECENT_MS = 7 * 24 * 3_600_000;
const CACHE_TTL_MS = 3_600_000;
const MAX_DESCRIPTION_LENGTH = 300;
/** The Data API answers up to this many video ids per call. */
const VIDEOS_PER_CALL = 50;

const subscriptionsSchema = z.object({
  items: z
    .array(
      z.object({
        snippet: z.object({
          title: z.string(),
          resourceId: z.object({ channelId: z.string() }),
        }),
      }),
    )
    .optional(),
});

const playlistItemsSchema = z.object({
  items: z
    .array(
      z.object({
        contentDetails: z.object({
          videoId: z.string(),
          videoPublishedAt: z.string().optional(),
        }),
      }),
    )
    .optional(),
});

const videosSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string(),
        snippet: z.object({
          title: z.string(),
          description: z.string().optional(),
          channelTitle: z.string(),
          publishedAt: z.string().optional(),
        }),
        statistics: z.object({ viewCount: z.string().optional() }).optional(),
      }),
    )
    .optional(),
});

const caches = new Map<string, { items: Item[]; expiresAt: number }>();

const ytFetch = async <T>(
  accessToken: string,
  path: string,
  params: Record<string, string>,
  schema: z.ZodType<T>,
): Promise<T> => {
  const url = new URL(`${YT_BASE}/${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error(`YouTube request failed (${response.status})`);
  return schema.parse(await response.json());
};

/** A channel's uploads playlist has the channel's id with its "UC" prefix swapped for "UU". */
const uploadsPlaylistId = (channelId: string): string => `UU${channelId.slice(2)}`;

const fetchUploads = async (access: AccessOf<"youtube">): Promise<Item[]> => {
  const subscriptions = await ytFetch(
    access.accessToken,
    "subscriptions",
    { part: "snippet", mine: "true", maxResults: String(MAX_CHANNELS) },
    subscriptionsSchema,
  );
  const channelIds = (subscriptions.items ?? []).map((sub) => sub.snippet.resourceId.channelId);

  const since = Date.now() - RECENT_MS;
  const playlists = await Promise.all(
    channelIds.map(async (channelId) => {
      try {
        return await ytFetch(
          access.accessToken,
          "playlistItems",
          {
            part: "contentDetails",
            playlistId: uploadsPlaylistId(channelId),
            maxResults: String(UPLOADS_PER_CHANNEL),
          },
          playlistItemsSchema,
        );
      } catch {
        // A channel with no uploads playlist answers 404; it has nothing to air.
        return { items: [] };
      }
    }),
  );
  const videoIds = playlists.flatMap((playlist) =>
    (playlist.items ?? [])
      .filter((entry) => {
        const published = entry.contentDetails.videoPublishedAt;
        return published === undefined || Date.parse(published) >= since;
      })
      .map((entry) => entry.contentDetails.videoId),
  );

  const items: Item[] = [];
  for (let start = 0; start < videoIds.length; start += VIDEOS_PER_CALL) {
    const videos = await ytFetch(
      access.accessToken,
      "videos",
      { part: "snippet,statistics", id: videoIds.slice(start, start + VIDEOS_PER_CALL).join(",") },
      videosSchema,
    );
    for (const video of videos.items ?? []) {
      const item: Item = {
        id: `youtube:${video.id}`,
        kind: "youtube",
        text: `${video.snippet.title}. ${plainText(video.snippet.description ?? "", MAX_DESCRIPTION_LENGTH)}`.trim(),
        score: Number(video.statistics?.viewCount ?? 0),
        author: { name: video.snippet.channelTitle, username: video.snippet.channelTitle },
      };
      if (video.snippet.publishedAt !== undefined) item.createdAt = video.snippet.publishedAt;
      items.push(item);
    }
  }
  return items;
};

export const pickYoutubeCandidate = async (
  access: AccessOf<"youtube">,
  sourceId: string,
  aired: Set<string>,
): Promise<Item | undefined> => {
  const cached = caches.get(sourceId);
  let items: Item[];
  if (cached !== undefined && cached.expiresAt > Date.now()) {
    items = cached.items;
  } else {
    items = await fetchUploads(access);
    caches.set(sourceId, { items, expiresAt: Date.now() + CACHE_TTL_MS });
  }
  return bestOf(items.filter((item) => !aired.has(item.id)));
};
