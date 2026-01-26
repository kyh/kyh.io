import { createFileRoute, redirect } from "@tanstack/react-router";

import { db } from "@/db/index";
import { incidents, videos } from "@/db/schema";
import {
  detectPlatform,
  isValidVideoUrl,
  resolveVideoUrl,
} from "@/lib/video-utils";

const MAX_INPUT_LENGTH = 2048;

// Sanitize and limit input length
function sanitizeInput(input?: string): string | undefined {
  if (!input) return undefined;
  return input.slice(0, MAX_INPUT_LENGTH);
}

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
    const found = extractUrls(text).find(isValidVideoUrl);
    if (found) return found;
  }

  if (title) {
    const found = extractUrls(title).find(isValidVideoUrl);
    if (found) return found;
  }

  return null;
}

export const Route = createFileRoute("/share")({
  validateSearch: (search: Record<string, unknown>) => ({
    url: sanitizeInput(search.url as string | undefined),
    text: sanitizeInput(search.text as string | undefined),
    title: sanitizeInput(search.title as string | undefined),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps: { url, text, title } }) => {
    let videoUrl = findVideoUrl(url, text, title);

    if (!videoUrl) {
      throw redirect({
        to: "/",
        search: { error: "invalid_url" },
      });
    }

    // Resolve Twitter/X URLs to get the actual embeddable URL
    videoUrl = await resolveVideoUrl(videoUrl);

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

    // Create new incident with transaction to ensure atomicity
    const platform = detectPlatform(videoUrl);
    const incident = await db.transaction(async (tx) => {
      const [newIncident] = await tx
        .insert(incidents)
        .values({
          status: "approved",
          incidentDate: new Date(),
        })
        .returning();

      await tx.insert(videos).values({
        incidentId: newIncident.id,
        url: videoUrl,
        platform,
      });

      return newIncident;
    });

    throw redirect({
      to: "/incident/$id",
      params: { id: String(incident.id) },
    });
  },
  component: () => null,
});
