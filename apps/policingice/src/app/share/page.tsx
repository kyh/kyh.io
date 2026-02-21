import { redirect } from "next/navigation";

import { db } from "@/db/index";
import { incidents, videos } from "@/db/schema";
import {
  detectPlatform,
  isValidVideoUrl,
  resolveVideoUrl,
} from "@/lib/video-utils";

const MAX_INPUT_LENGTH = 2048;

function sanitizeInput(input?: string): string | undefined {
  if (!input) return undefined;
  return input.slice(0, MAX_INPUT_LENGTH);
}

function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  const matches = text.match(urlRegex) || [];
  return matches.map((url) => url.replace(/[.,;:!?)]+$/, ""));
}

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

export default async function SharePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const url = sanitizeInput(params.url);
  const text = sanitizeInput(params.text);
  const title = sanitizeInput(params.title);

  let videoUrl = findVideoUrl(url, text, title);

  if (!videoUrl) {
    redirect("/?error=invalid_url");
  }

  // Resolve Twitter/X URLs to get the actual embeddable URL
  videoUrl = await resolveVideoUrl(videoUrl);

  // Check if URL already exists
  const existingVideo = await db.query.videos.findFirst({
    where: (videos, { eq }) => eq(videos.url, videoUrl),
  });

  if (existingVideo) {
    redirect(`/incident/${existingVideo.incidentId}`);
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

    if (!newIncident) throw new Error("Failed to create incident");

    await tx.insert(videos).values({
      incidentId: newIncident.id,
      url: videoUrl,
      platform,
    });

    return newIncident;
  });

  redirect(`/incident/${incident!.id}`);
}
