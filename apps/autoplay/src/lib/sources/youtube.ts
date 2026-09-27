import { z } from "zod";

import { cachedPick, fetchJson, plainText } from "./types";
import type { AccessOf, Item, SourceContext } from "./types";

// YouTube as a source: recent uploads from the channels the account follows,
// most viewed first. The Data API has a 10 000-unit daily quota; a refresh
// here costs about MAX_CHANNELS + 3 units, and the hour-long cache keeps a
// watching owner from spending it per program.

const YT_BASE = "https://www.googleapis.com/youtube/v3";
const MAX_CHANNELS = 20;
const UPLOADS_PER_CHANNEL = 3;
/** An old viral upload must not win forever; only this window competes. */
const RECENT_MS = 7 * 24 * 3_600_000;
const MAX_DESCRIPTION_LENGTH = 300;
/** The Data API answers up to this many video ids per call. */
const VIDEOS_PER_CALL = 50;

const subscriptionsSchema = z.object({
  items: z
    .array(
      z.object({
        snippet: z.object({
          resourceId: z.object({ channelId: z.string() }),
          title: z.string(),
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
          channelTitle: z.string(),
          description: z.string().optional(),
          publishedAt: z.string().optional(),
          title: z.string(),
        }),
        statistics: z.object({ viewCount: z.string().optional() }).optional(),
      }),
    )
    .optional(),
});

const ytFetch = <T>(
  accessToken: string,
  path: string,
  params: Record<string, string>,
  schema: z.ZodType<T>,
): Promise<T> => {
  const url = new URL(`${YT_BASE}/${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return fetchJson("YouTube", url, accessToken, schema);
};

/** A channel's uploads playlist has the channel's id with its "UC" prefix swapped for "UU". */
const uploadsPlaylistId = (channelId: string): string => `UU${channelId.slice(2)}`;

const fetchUploads = async (access: AccessOf<"youtube">): Promise<Item[]> => {
  const subscriptions = await ytFetch(
    access.accessToken,
    "subscriptions",
    { maxResults: String(MAX_CHANNELS), mine: "true", part: "snippet" },
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
            maxResults: String(UPLOADS_PER_CHANNEL),
            part: "contentDetails",
            playlistId: uploadsPlaylistId(channelId),
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
      { id: videoIds.slice(start, start + VIDEOS_PER_CALL).join(","), part: "snippet,statistics" },
      videosSchema,
    );
    for (const video of videos.items ?? []) {
      items.push({
        author: { name: video.snippet.channelTitle, username: video.snippet.channelTitle },
        createdAt: video.snippet.publishedAt,
        id: `youtube:${video.id}`,
        kind: "youtube",
        link: `https://www.youtube.com/watch?v=${video.id}`,
        score: Number(video.statistics?.viewCount ?? 0),
        text: `${video.snippet.title}. ${plainText(video.snippet.description ?? "", MAX_DESCRIPTION_LENGTH)}`.trim(),
      });
    }
  }
  return items;
};

export const pickYoutubeCandidate = (
  access: AccessOf<"youtube">,
  sourceId: string,
  context: SourceContext,
): Promise<Item | undefined> =>
  cachedPick(context, `youtube:${sourceId}`, () => fetchUploads(access));
