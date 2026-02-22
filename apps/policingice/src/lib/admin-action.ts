"use server";

import { revalidateTag } from "next/cache";
import { desc, eq, inArray, isNull } from "drizzle-orm";

import type { IncidentStatus } from "@/db/schema";
import { db } from "@/db/index";
import { incidents, videos } from "@/db/schema";
import { getAdminUser } from "@/lib/admin-auth";
import {
  detectPlatform,
  isValidVideoUrl,
  resolveVideoUrl,
} from "@/lib/video-utils";

export async function getAllIncidents() {
  const admin = await getAdminUser();
  if (!admin) throw new Error("Unauthorized");

  const results = await db.query.incidents.findMany({
    with: { videos: true },
    where: isNull(incidents.deletedAt),
    orderBy: [desc(incidents.createdAt)],
  });
  return results;
}

export async function updateIncident(data: {
  id: number;
  location?: string;
  description?: string;
  incidentDate?: string;
  status?: IncidentStatus;
}) {
  const admin = await getAdminUser();
  if (!admin) throw new Error("Unauthorized");

  function parseLocalDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  await db
    .update(incidents)
    .set({
      location: data.location,
      description: data.description,
      incidentDate: data.incidentDate
        ? parseLocalDate(data.incidentDate)
        : null,
      status: data.status,
    })
    .where(eq(incidents.id, data.id));
  revalidateTag("incidents", "max");
  return { success: true };
}

export async function toggleIncidentStatus(data: {
  id: number;
  currentStatus: IncidentStatus;
}) {
  const admin = await getAdminUser();
  if (!admin) throw new Error("Unauthorized");

  const newStatus = data.currentStatus === "approved" ? "hidden" : "approved";
  await db
    .update(incidents)
    .set({ status: newStatus })
    .where(eq(incidents.id, data.id));
  revalidateTag("incidents", "max");
  return { success: true, newStatus };
}

export async function toggleIncidentPinned(data: {
  id: number;
  currentPinned: boolean;
}) {
  const admin = await getAdminUser();
  if (!admin) throw new Error("Unauthorized");

  const newPinned = !data.currentPinned;
  await db
    .update(incidents)
    .set({ pinned: newPinned })
    .where(eq(incidents.id, data.id));
  revalidateTag("incidents", "max");
  return { success: true, newPinned };
}

export async function adminDeleteIncident(data: { id: number }) {
  const admin = await getAdminUser();
  if (!admin) throw new Error("Unauthorized");

  await db.delete(incidents).where(eq(incidents.id, data.id));
  revalidateTag("incidents", "max");
  return { success: true };
}

export async function addVideo(data: { incidentId: number; url: string }) {
  const admin = await getAdminUser();
  if (!admin) throw new Error("Unauthorized");

  const platform = detectPlatform(data.url);
  await db.insert(videos).values({
    incidentId: data.incidentId,
    url: data.url,
    platform,
  });
  revalidateTag("incidents", "max");
  return { success: true };
}

export async function updateVideo(data: { id: number; url: string }) {
  const admin = await getAdminUser();
  if (!admin) throw new Error("Unauthorized");

  const platform = detectPlatform(data.url);
  await db
    .update(videos)
    .set({ url: data.url, platform })
    .where(eq(videos.id, data.id));
  revalidateTag("incidents", "max");
  return { success: true };
}

export async function deleteVideo(data: { id: number }) {
  const admin = await getAdminUser();
  if (!admin) throw new Error("Unauthorized");

  await db.delete(videos).where(eq(videos.id, data.id));
  revalidateTag("incidents", "max");
  return { success: true };
}

export async function bulkCreateIncidents(data: {
  urls: string[];
  groupAsOne: boolean;
  location?: string;
  description?: string;
  incidentDate?: string;
}) {
  const admin = await getAdminUser();
  if (!admin) throw new Error("Unauthorized");

  const validUrls = data.urls.filter((url) => isValidVideoUrl(url));
  if (validUrls.length === 0) {
    return { created: 0, skipped: 0, error: "No valid URLs" };
  }

  const resolvedUrls = await Promise.all(validUrls.map(resolveVideoUrl));

  const existingVideos = await db.query.videos.findMany({
    where: inArray(videos.url, resolvedUrls),
  });
  const existingUrls = new Set(existingVideos.map((v) => v.url));
  const newUrls = resolvedUrls.filter((url) => !existingUrls.has(url));

  if (newUrls.length === 0) {
    return { created: 0, skipped: validUrls.length };
  }

  const incidentDate = data.incidentDate
    ? new Date(data.incidentDate)
    : new Date();

  if (data.groupAsOne) {
    const [incident] = await db
      .insert(incidents)
      .values({
        location: data.location ?? null,
        description: data.description ?? null,
        incidentDate,
        status: "approved",
      })
      .returning();

    await db.insert(videos).values(
      newUrls.map((url) => ({
        incidentId: incident.id,
        url,
        platform: detectPlatform(url),
      })),
    );

    revalidateTag("incidents", "max");
    return { created: 1, skipped: existingUrls.size };
  } else {
    let created = 0;
    for (const url of newUrls) {
      const [incident] = await db
        .insert(incidents)
        .values({
          location: data.location ?? null,
          description: data.description ?? null,
          incidentDate,
          status: "approved",
        })
        .returning();

      await db.insert(videos).values({
        incidentId: incident.id,
        url,
        platform: detectPlatform(url),
      });
      created++;
    }

    revalidateTag("incidents", "max");
    return { created, skipped: existingUrls.size };
  }
}

export async function getFeedPosts() {
  const admin = await getAdminUser();
  if (!admin) throw new Error("Unauthorized");

  const res = await fetch("https://www.reddit.com/r/ICE_Watch.rss", {
    headers: {
      "User-Agent": "PolicingICE/1.0",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch feed: ${res.status}`);
  }

  const xml = await res.text();
  const posts = parseAtomFeed(xml);

  const existingVideos = await db.query.videos.findMany({
    where: (v, { like }) => like(v.url, "%reddit.com%"),
    columns: { url: true },
  });
  const existingUrls = existingVideos.map((v) => normalizeUrl(v.url));

  return { posts, existingUrls };
}

export async function createFromFeed(data: {
  url: string;
  title: string;
  published: string;
}) {
  const admin = await getAdminUser();
  if (!admin) throw new Error("Unauthorized");

  const existing = await db.query.videos.findFirst({
    where: (v, { eq }) => eq(v.url, data.url),
  });

  if (existing) {
    return { success: false, error: "Already added" };
  }

  const [incident] = await db
    .insert(incidents)
    .values({
      description: data.title,
      incidentDate: data.published ? new Date(data.published) : new Date(),
      status: "approved",
    })
    .returning();

  await db.insert(videos).values({
    incidentId: incident.id,
    url: data.url,
    platform: detectPlatform(data.url),
  });

  revalidateTag("incidents", "max");
  return { success: true, incidentId: incident.id };
}

// Helpers

type FeedPost = {
  id: string;
  title: string;
  link: string;
  content: string;
  published: string;
};

function parseAtomFeed(xml: string): FeedPost[] {
  const posts: FeedPost[] = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];

    const id = /<id>([^<]+)<\/id>/.exec(entry)?.[1] ?? "";
    const title = /<title>([^<]+)<\/title>/.exec(entry)?.[1] ?? "";
    const link = /<link href="([^"]+)"/.exec(entry)?.[1] ?? "";
    const content =
      /<content[^>]*>([\s\S]*?)<\/content>/.exec(entry)?.[1] ?? "";
    const published = /<updated>([^<]+)<\/updated>/.exec(entry)?.[1] ?? "";

    if (id && link) {
      posts.push({
        id,
        title: decodeHTMLEntities(title),
        link,
        content: decodeHTMLEntities(content),
        published,
      });
    }
  }

  return posts;
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`.replace(/\/$/, "");
  } catch {
    return url.split("?")[0].replace(/\/$/, "");
  }
}
