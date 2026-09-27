"use server";

import { revalidateTag } from "next/cache";
import { eq } from "drizzle-orm";

import type { IncidentStatus } from "@/db/drizzle-schema";
import { db } from "@/db/drizzle-client";
import { incidents, videos } from "@/db/drizzle-schema";
import { getSession } from "@/lib/auth";
import { detectPlatform, isValidVideoUrl, resolveVideoUrl } from "@/lib/video-utils";

interface FeedPost {
  id: string;
  title: string;
  link: string;
  content: string;
  published: string;
}

const decodeHTMLEntities = (text: string): string =>
  text
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'");

const feedField = (entry: string, pattern: RegExp): string =>
  pattern.exec(entry)?.groups?.value ?? "";

const parseAtomFeed = (xml: string): FeedPost[] => {
  const posts: FeedPost[] = [];

  for (const match of xml.matchAll(/<entry>(?<body>[\s\S]*?)<\/entry>/gu)) {
    const entry = match.groups?.body ?? "";

    const id = feedField(entry, /<id>(?<value>[^<]+)<\/id>/u);
    const title = feedField(entry, /<title>(?<value>[^<]+)<\/title>/u);
    const link = feedField(entry, /<link href="(?<value>[^"]+)"/u);
    const content = feedField(entry, /<content[^>]*>(?<value>[\s\S]*?)<\/content>/u);
    const published = feedField(entry, /<updated>(?<value>[^<]+)<\/updated>/u);

    if (id && link) {
      posts.push({
        content: decodeHTMLEntities(content),
        id,
        link,
        published,
        title: decodeHTMLEntities(title),
      });
    }
  }

  return posts;
};

const normalizeUrl = (url: string): string => {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`.replace(/\/$/u, "");
  } catch {
    return url.split("?")[0].replace(/\/$/u, "");
  }
};

const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const requireAdmin = async () => {
  const session = await getSession();
  if (!session?.user || session.user.isAnonymous) {
    throw new Error("Unauthorized");
  }
  return session.user;
};

export const getAllIncidents = async () => {
  await requireAdmin();

  const results = await db.query.incidents.findMany({
    orderBy: { createdAt: "desc" },
    where: { deletedAt: { isNull: true } },
    with: { videos: true },
  });
  return results;
};

export const updateIncident = async (data: {
  id: number;
  location?: string;
  description?: string;
  incidentDate?: string;
  status?: IncidentStatus;
}) => {
  await requireAdmin();

  await db
    .update(incidents)
    .set({
      description: data.description,
      incidentDate: data.incidentDate ? parseLocalDate(data.incidentDate) : null,
      location: data.location,
      status: data.status,
    })
    .where(eq(incidents.id, data.id));
  revalidateTag("incidents", "max");
  return { success: true };
};

export const toggleIncidentStatus = async (data: { id: number }) => {
  await requireAdmin();

  const incident = await db.query.incidents.findFirst({ where: { id: data.id } });
  if (!incident) {
    return { error: "Not found", success: false };
  }

  const newStatus = incident.status === "approved" ? "hidden" : "approved";
  await db.update(incidents).set({ status: newStatus }).where(eq(incidents.id, data.id));
  revalidateTag("incidents", "max");
  return { newStatus, success: true };
};

export const toggleIncidentPinned = async (data: { id: number }) => {
  await requireAdmin();

  const incident = await db.query.incidents.findFirst({ where: { id: data.id } });
  if (!incident) {
    return { error: "Not found", success: false };
  }

  const newPinned = !incident.pinned;
  await db.update(incidents).set({ pinned: newPinned }).where(eq(incidents.id, data.id));
  revalidateTag("incidents", "max");
  return { newPinned, success: true };
};

export const adminDeleteIncident = async (data: { id: number }) => {
  await requireAdmin();

  await db.delete(incidents).where(eq(incidents.id, data.id));
  revalidateTag("incidents", "max");
  return { success: true };
};

export const addVideo = async (data: { incidentId: number; url: string }) => {
  await requireAdmin();

  const platform = detectPlatform(data.url);
  await db.insert(videos).values({
    incidentId: data.incidentId,
    platform,
    url: data.url,
  });
  revalidateTag("incidents", "max");
  return { success: true };
};

export const updateVideo = async (data: { id: number; url: string }) => {
  await requireAdmin();

  const platform = detectPlatform(data.url);
  await db.update(videos).set({ platform, url: data.url }).where(eq(videos.id, data.id));
  revalidateTag("incidents", "max");
  return { success: true };
};

export const deleteVideo = async (data: { id: number }) => {
  await requireAdmin();

  await db.delete(videos).where(eq(videos.id, data.id));
  revalidateTag("incidents", "max");
  return { success: true };
};

export const bulkCreateIncidents = async (data: {
  urls: string[];
  groupAsOne: boolean;
  location?: string;
  description?: string;
  incidentDate?: string;
}) => {
  await requireAdmin();

  const validUrls = data.urls.filter((url) => isValidVideoUrl(url));
  if (validUrls.length === 0) {
    return { created: 0, error: "No valid URLs", skipped: 0 };
  }

  const resolvedUrls = await Promise.all(validUrls.map(resolveVideoUrl));

  const existingVideos = await db.query.videos.findMany({
    where: { url: { in: resolvedUrls } },
  });
  const existingUrls = new Set(existingVideos.map((v) => v.url));
  const newUrls = resolvedUrls.filter((url) => !existingUrls.has(url));

  if (newUrls.length === 0) {
    return { created: 0, skipped: validUrls.length };
  }

  const incidentDate = data.incidentDate ? new Date(data.incidentDate) : new Date();

  if (data.groupAsOne) {
    const [incident] = await db
      .insert(incidents)
      .values({
        description: data.description ?? null,
        incidentDate,
        location: data.location ?? null,
        status: "approved",
      })
      .returning();

    await db.insert(videos).values(
      newUrls.map((url) => ({
        incidentId: incident.id,
        platform: detectPlatform(url),
        url,
      })),
    );

    revalidateTag("incidents", "max");
    return { created: 1, skipped: existingUrls.size };
  }
  let created = 0;
  for (const url of newUrls) {
    const [incident] = await db
      .insert(incidents)
      .values({
        description: data.description ?? null,
        incidentDate,
        location: data.location ?? null,
        status: "approved",
      })
      .returning();

    await db.insert(videos).values({
      incidentId: incident.id,
      platform: detectPlatform(url),
      url,
    });
    created += 1;
  }

  revalidateTag("incidents", "max");
  return { created, skipped: existingUrls.size };
};

export const getFeedPosts = async () => {
  await requireAdmin();

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
    columns: { url: true },
    where: { url: { like: "%reddit.com%" } },
  });
  const existingUrls = existingVideos.map((v) => normalizeUrl(v.url));

  return { existingUrls, posts };
};

export const createFromFeed = async (data: { url: string; title: string; published: string }) => {
  await requireAdmin();

  const existing = await db.query.videos.findFirst({
    where: { url: data.url },
  });

  if (existing) {
    return { error: "Already added", success: false };
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
    platform: detectPlatform(data.url),
    url: data.url,
  });

  revalidateTag("incidents", "max");
  return { incidentId: incident.id, success: true };
};
