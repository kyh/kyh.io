import { createFileRoute, redirect } from "@tanstack/react-router";

import { db } from "@/db/index";
import { incidents, videos } from "@/db/schema";
import { detectPlatform, isValidVideoUrl } from "@/lib/video-utils";

// Extract URLs from shared text content
function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  const matches = text.match(urlRegex) || [];
  return matches.map((url) => url.replace(/[.,;:!?)]+$/, ""));
}

// Find the first valid video URL from shared content
function findVideoUrl(
  url?: string,
  text?: string,
  title?: string,
): string | null {
  if (url && isValidVideoUrl(url)) {
    return url;
  }

  if (text) {
    const urls = extractUrls(text);
    for (const u of urls) {
      if (isValidVideoUrl(u)) return u;
    }
  }

  if (title) {
    const urls = extractUrls(title);
    for (const u of urls) {
      if (isValidVideoUrl(u)) return u;
    }
  }

  return null;
}

export const Route = createFileRoute("/share")({
  validateSearch: (search: Record<string, unknown>) => ({
    url: search.url as string | undefined,
    text: search.text as string | undefined,
    title: search.title as string | undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps: { url, text, title } }) => {
    const videoUrl = findVideoUrl(url, text, title);

    if (!videoUrl) {
      throw redirect({ to: "/" });
    }

    // Check if URL already exists
    const existingVideo = await db.query.videos.findFirst({
      where: (videos, { eq }) => eq(videos.url, videoUrl),
    });

    if (existingVideo) {
      throw redirect({
        to: "/incident/$id",
        params: { id: String(existingVideo.incidentId) },
      });
    }

    // Create new incident
    const platform = detectPlatform(videoUrl);
    const [incident] = await db
      .insert(incidents)
      .values({
        status: "approved",
        incidentDate: new Date(),
      })
      .returning();

    await db.insert(videos).values({
      incidentId: incident.id,
      url: videoUrl,
      platform,
    });

    throw redirect({
      to: "/incident/$id",
      params: { id: String(incident.id) },
    });
  },
  component: () => null,
});
