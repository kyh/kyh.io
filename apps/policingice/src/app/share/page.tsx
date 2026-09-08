import { Suspense } from "react";
import { redirect } from "next/navigation";

import { db } from "@/db/drizzle-client";
import { incidents, videos } from "@/db/drizzle-schema";
import { detectPlatform, isValidVideoUrl, resolveVideoUrl } from "@/lib/video-utils";

const MAX_INPUT_LENGTH = 2048;

const sanitizeInput = (input?: string): string | undefined => {
  if (!input) {
    return undefined;
  }
  return input.slice(0, MAX_INPUT_LENGTH);
};

const extractUrls = (text: string): string[] => {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/giu;
  const matches = text.match(urlRegex) ?? [];
  return matches.map((url) => url.replace(/[.,;:!?)]+$/u, ""));
};

const findVideoUrl = (url?: string, text?: string, title?: string): string | null => {
  if (url && isValidVideoUrl(url)) {
    return url;
  }

  if (text) {
    const found = extractUrls(text).find(isValidVideoUrl);
    if (found) {
      return found;
    }
  }

  if (title) {
    const found = extractUrls(title).find(isValidVideoUrl);
    if (found) {
      return found;
    }
  }

  return null;
};

const ShareHandler = async ({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) => {
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
    where: (v, { eq }) => eq(v.url, videoUrl),
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
        incidentDate: new Date(),
        status: "approved",
      })
      .returning();

    await tx.insert(videos).values({
      incidentId: newIncident.id,
      platform,
      url: videoUrl,
    });

    return newIncident;
  });

  redirect(`/incident/${incident.id}`);
};

const SharePage = ({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) => (
  <Suspense
    fallback={
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-sm text-muted-foreground">Redirecting...</span>
      </div>
    }
  >
    <ShareHandler searchParams={searchParams} />
  </Suspense>
);

export default SharePage;
