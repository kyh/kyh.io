import { z } from "zod";

import { cachedPick, fetchJson, plainText } from "./types";
import type { AccessOf, Item, SourceContext } from "./types";

const YT_BASE = "https://www.googleapis.com/youtube/v3";
const MAX_CHANNELS = 20;
const UPLOADS_PER_CHANNEL = 3;
const RECENT_MS = 7 * 24 * 3_600_000;
const MAX_DESCRIPTION_LENGTH = 300;
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

const ytFetch = async <T>(
  accessToken: string,
  path: string,
  params: Record<string, string>,
  schema: z.ZodType<T>,
) => {
  const url = new URL(`${YT_BASE}/${path}`);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return await fetchJson("YouTube", url, accessToken, schema);
};

const uploadsPlaylistId = (channelId: string) => `UU${channelId.slice(2)}`;

const fetchUploads = async (access: AccessOf<"youtube">) => {
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

  const batches = await Promise.all(
    Array.from({ length: Math.ceil(videoIds.length / VIDEOS_PER_CALL) }, async (_, batch) => {
      const start = batch * VIDEOS_PER_CALL;

      const videos = await ytFetch(
        access.accessToken,
        "videos",
        {
          id: videoIds.slice(start, start + VIDEOS_PER_CALL).join(","),
          part: "snippet,statistics",
        },
        videosSchema,
      );

      return (videos.items ?? []).map(
        (video) =>
          ({
            author: { name: video.snippet.channelTitle, username: video.snippet.channelTitle },
            createdAt: video.snippet.publishedAt,
            id: `youtube:${video.id}`,
            kind: "youtube",
            link: `https://www.youtube.com/watch?v=${video.id}`,
            score: Number(video.statistics?.viewCount ?? 0),
            text: `${video.snippet.title}. ${plainText(video.snippet.description ?? "", MAX_DESCRIPTION_LENGTH)}`.trim(),
          }) satisfies Item,
      );
    }),
  );

  const items = batches.flat();

  return items;
};

export const pickYoutubeCandidate = async (
  access: AccessOf<"youtube">,
  sourceId: string,
  context: SourceContext,
) => await cachedPick(context, `youtube:${sourceId}`, async () => await fetchUploads(access));
