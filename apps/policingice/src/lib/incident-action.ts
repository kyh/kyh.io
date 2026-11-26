"use server";

import { revalidateTag } from "next/cache";
import { embed } from "ai";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { client, db } from "@/db/drizzle-client";
import { incidents, videos, votes } from "@/db/drizzle-schema";

import type { VoteType } from "@/db/drizzle-schema";

import { getSession } from "@/lib/auth";
import { getIncidents as getCachedIncidents } from "@/lib/incident-query";
import { detectPlatform, resolveVideoUrl } from "@/lib/video-utils";

const vectorRowSchema = z.object({
  created_at: z.number().nullable(),
  deleted_at: z.number().nullable(),
  description: z.string().nullable(),
  embedding: z.custom<Buffer | null>(),
  id: z.number(),
  incident_date: z.number().nullable(),
  justified_count: z.number(),
  location: z.string().nullable(),
  pinned: z.number(),
  platform: z
    .enum([
      "twitter",
      "youtube",
      "tiktok",
      "facebook",
      "instagram",
      "linkedin",
      "pinterest",
      "reddit",
    ])
    .nullable(),
  report_count: z.number(),
  status: z.enum(["approved", "hidden"]),
  unjustified_count: z.number(),
  url: z.string().nullable(),
  v_created_at: z.number().nullable(),
  vec_distance: z.number(),
  vid: z.number().nullable(),
});

const requireAdmin = async () => {
  const session = await getSession();

  if (!session?.user || session.user.isAnonymous === true) {
    throw new Error("Unauthorized");
  }

  return session.user;
};

const parseLocalDate = (dateStr: string) => {
  const parts = dateStr.split("-").map(Number);

  return new Date(parts[0], parts[1] - 1, parts[2]);
};

const dateOf = (seconds: number | null) =>
  seconds !== null && seconds !== 0 ? new Date(seconds * 1000) : null;

const given = (value: string | undefined): value is string => value !== undefined && value !== "";

const newestFirst = (inc: typeof incidents) => [
  desc(sql`IFNULL(${inc.incidentDate}, 9999999999)`),
  desc(inc.id),
];

export const getIncidents = async (data: { offset?: number; limit?: number }) =>
  await getCachedIncidents(data);

export const searchIncidents = async (data: {
  query?: string;
  startDate?: string;
  endDate?: string;
}) => {
  const rangeStart = given(data.startDate) ? parseLocalDate(data.startDate) : undefined;

  const rangeEnd = given(data.endDate) ? parseLocalDate(data.endDate) : undefined;

  rangeEnd?.setDate(rangeEnd.getDate() + 1);

  const baseFilter = {
    deletedAt: { isNull: true },
    incidentDate: { gte: rangeStart, lte: rangeEnd },
    reportCount: { lt: 3 },
    status: "approved",
  } as const;

  if (!given(data.query)) {
    const results = await db.query.incidents.findMany({
      limit: 50,
      orderBy: newestFirst,
      where: baseFilter,
      with: { videos: true },
    });

    return { incidents: results };
  }

  const resultMap = new Map<
    number,
    Awaited<ReturnType<typeof db.query.incidents.findMany>>[0] & {
      videos: (typeof videos.$inferSelect)[];
      _score: number;
    }
  >();

  const q = `%${data.query}%`;

  const keywordResults = await db.query.incidents.findMany({
    limit: 30,
    orderBy: newestFirst,
    where: { ...baseFilter, OR: [{ location: { like: q } }, { description: { like: q } }] },
    with: { videos: true },
  });

  for (const [idx, incident] of keywordResults.entries()) {
    resultMap.set(incident.id, { ...incident, _score: 100 - idx });
  }

  try {
    const { embedding } = await embed({
      model: "openai/text-embedding-3-small",
      value: data.query,
    });

    const vectorStr = `[${embedding.join(",")}]`;

    let dateConditions = "";
    const args: (string | number)[] = [vectorStr];

    if (given(data.startDate)) {
      const start = Math.floor(parseLocalDate(data.startDate).getTime() / 1000);
      dateConditions += " AND i.incident_date >= ?";
      args.push(start);
    }

    if (given(data.endDate)) {
      const end = parseLocalDate(data.endDate);
      end.setDate(end.getDate() + 1);
      dateConditions += " AND i.incident_date <= ?";
      args.push(Math.floor(end.getTime() / 1000));
    }

    const vectorResult = await client.execute({
      args,
      sql: `
        SELECT i.*, v.id as vid, v.url, v.platform, v.created_at as v_created_at,
               vec.distance as vec_distance
        FROM vector_top_k('incidents_embedding_idx', vector32(?), 30) AS vec
        JOIN incidents i ON i.rowid = vec.id
        LEFT JOIN videos v ON v.incident_id = i.id
        WHERE i.status = 'approved'
          AND i.deleted_at IS NULL
          AND i.report_count < 3
          ${dateConditions}
        ORDER BY vec.distance ASC
      `,
    });

    const vectorIncidents = new Map<
      number,
      {
        incident: typeof incidents.$inferSelect & {
          videos: (typeof videos.$inferSelect)[];
        };
        distance: number;
      }
    >();

    for (const rawRow of vectorResult.rows) {
      const row = vectorRowSchema.parse(rawRow);
      const { id } = row;
      let entry = vectorIncidents.get(id);

      if (!entry) {
        entry = {
          distance: row.vec_distance,
          incident: {
            createdAt: dateOf(row.created_at),
            deletedAt: dateOf(row.deleted_at),
            description: row.description,
            embedding: row.embedding,
            id,
            incidentDate: dateOf(row.incident_date),
            justifiedCount: row.justified_count,
            location: row.location,
            pinned: row.pinned === 1,
            reportCount: row.report_count,
            status: row.status,
            unjustifiedCount: row.unjustified_count,
            videos: [],
          },
        };
        vectorIncidents.set(id, entry);
      }

      if (row.vid !== null && row.vid !== 0 && row.url !== null && row.url !== "" && row.platform) {
        entry.incident.videos.push({
          createdAt: dateOf(row.v_created_at),
          id: row.vid,
          incidentId: id,
          platform: row.platform,
          url: row.url,
        });
      }
    }

    let idx = 0;

    for (const [id, { incident, distance }] of vectorIncidents) {
      const vectorScore = 100 - idx - distance * 10;
      const existing = resultMap.get(id);

      if (existing) {
        existing._score += vectorScore;
      } else {
        resultMap.set(id, { ...incident, _score: vectorScore });
      }

      idx += 1;
    }
  } catch (error) {
    console.warn("Vector search unavailable, keyword results only:", error);
  }

  const sortedResults = [...resultMap.values()]
    .toSorted((a, b) => b._score - a._score)
    .slice(0, 50)
    .map(({ _score, ...incident }) => incident);

  return { incidents: sortedResults };
};

export const getUserVotes = async (data: { incidentIds: number[] }) => {
  if (data.incidentIds.length === 0) {
    return {};
  }

  const session = await getSession();

  if (session === null || session.user.id === undefined || session.user.id === "") {
    return {};
  }

  const userVotes = await db.query.votes.findMany({
    where: { incidentId: { in: data.incidentIds }, sessionId: session.user.id },
  });

  const byIncident: Record<number, VoteType> = {};

  for (const vote of userVotes) {
    byIncident[vote.incidentId] = vote.type;
  }

  return byIncident;
};

export const getUserVote = async (data: { incidentId: number }) => {
  const session = await getSession();

  if (session === null || session.user.id === undefined || session.user.id === "") {
    return null;
  }

  const vote = await db.query.votes.findFirst({
    where: { incidentId: data.incidentId, sessionId: session.user.id },
  });

  return vote?.type ?? null;
};

export const createIncident = async (data: {
  location?: string;
  description?: string;
  incidentDate?: string;
  videoUrls: string[];
}) => {
  const session = await getSession();

  if (session === null || session.user.id === undefined || session.user.id === "") {
    return { error: "Unauthorized", incident: null };
  }

  const resolvedUrls = await Promise.all(data.videoUrls.map(resolveVideoUrl));

  const existingVideos = await db.query.videos.findMany({
    where: { url: { in: resolvedUrls } },
    with: { incident: true },
  });

  if (existingVideos.length > 0) {
    const existingIncident = existingVideos[0].incident;
    const existingUrlSet = new Set(existingVideos.map((v) => v.url));
    const newUrls = resolvedUrls.filter((url) => !existingUrlSet.has(url));

    if (newUrls.length > 0) {
      await db.insert(videos).values(
        newUrls.map((url) => ({
          incidentId: existingIncident.id,
          platform: detectPlatform(url),
          url,
        })),
      );
    }

    revalidateTag("incidents", "max");

    return {
      autoApproved: true,
      incident: existingIncident,
      merged: true,
    };
  }

  const [incident] = await db
    .insert(incidents)
    .values({
      description: data.description,
      incidentDate:
        data.incidentDate !== undefined && data.incidentDate !== ""
          ? parseLocalDate(data.incidentDate)
          : new Date(),
      location: data.location,
      status: "approved",
    })
    .returning();

  await db.insert(videos).values(
    resolvedUrls.map((url) => ({
      incidentId: incident.id,
      platform: detectPlatform(url),
      url,
    })),
  );

  revalidateTag("incidents", "max");

  return { autoApproved: true, incident, merged: false };
};

export const submitVote = async (data: {
  incidentId: number;
  type: "unjustified" | "justified";
}) => {
  const session = await getSession();

  if (session === null || session.user.id === undefined || session.user.id === "") {
    return { error: "No session", success: false };
  }

  const sessionId = session.user.id;

  const existing = await db.query.votes.findFirst({
    where: { incidentId: data.incidentId, sessionId },
  });

  if (existing?.type === data.type) {
    await db.delete(votes).where(eq(votes.id, existing.id));
    const field = data.type === "unjustified" ? "unjustifiedCount" : "justifiedCount";
    await db
      .update(incidents)
      .set({ [field]: sql`${incidents[field]} - 1` })
      .where(eq(incidents.id, data.incidentId));
    revalidateTag("incidents", "max");

    return { action: "removed" as const, success: true };
  }

  if (existing) {
    const oldField = existing.type === "unjustified" ? "unjustifiedCount" : "justifiedCount";
    const newField = data.type === "unjustified" ? "unjustifiedCount" : "justifiedCount";
    await db.update(votes).set({ type: data.type }).where(eq(votes.id, existing.id));
    await db
      .update(incidents)
      .set({
        [oldField]: sql`${incidents[oldField]} - 1`,
        [newField]: sql`${incidents[newField]} + 1`,
      })
      .where(eq(incidents.id, data.incidentId));
    revalidateTag("incidents", "max");

    return { action: "switched" as const, success: true };
  }

  await db.insert(votes).values({
    incidentId: data.incidentId,
    sessionId,
    type: data.type,
  });

  const field = data.type === "unjustified" ? "unjustifiedCount" : "justifiedCount";
  await db
    .update(incidents)
    .set({ [field]: sql`${incidents[field]} + 1` })
    .where(eq(incidents.id, data.incidentId));

  revalidateTag("incidents", "max");

  return { action: "added" as const, success: true };
};

export const reportIncident = async (data: { incidentId: number }) => {
  await db
    .update(incidents)
    .set({ reportCount: sql`${incidents.reportCount} + 1` })
    .where(eq(incidents.id, data.incidentId));
  revalidateTag("incidents", "max");

  return { success: true };
};

export const addVideoToIncident = async (data: { incidentId: number; url: string }) => {
  const session = await getSession();

  if (session === null || session.user.id === undefined || session.user.id === "") {
    return { error: "Unauthorized", success: false };
  }

  const resolvedUrl = await resolveVideoUrl(data.url);
  const platform = detectPlatform(resolvedUrl);
  await db.insert(videos).values({
    incidentId: data.incidentId,
    platform,
    url: resolvedUrl,
  });
  revalidateTag("incidents", "max");

  return { success: true };
};

export const updateIncidentDetails = async (data: {
  incidentId: number;
  location?: string;
  description?: string;
  incidentDate?: string;
}) => {
  const session = await getSession();

  if (session === null || session.user.id === undefined || session.user.id === "") {
    return { error: "Unauthorized", success: false };
  }

  await db
    .update(incidents)
    .set({
      description: data.description ?? null,
      incidentDate:
        data.incidentDate !== undefined && data.incidentDate !== ""
          ? parseLocalDate(data.incidentDate)
          : null,
      location: data.location ?? null,
    })
    .where(eq(incidents.id, data.incidentId));
  revalidateTag("incidents", "max");

  return { success: true };
};

export const hideIncident = async (data: { incidentId: number }) => {
  await requireAdmin();

  await db
    .update(incidents)
    .set({ deletedAt: new Date() })
    .where(eq(incidents.id, data.incidentId));
  revalidateTag("incidents", "max");

  return { success: true };
};

export const deleteIncident = async (data: { incidentId: number }) => {
  await requireAdmin();

  await db.delete(incidents).where(eq(incidents.id, data.incidentId));
  revalidateTag("incidents", "max");

  return { success: true };
};

export const togglePinIncident = async (data: { incidentId: number }) => {
  await requireAdmin();

  const incident = await db.query.incidents.findFirst({
    where: { id: data.incidentId },
  });

  if (!incident) {
    return { error: "Not found", success: false };
  }

  await db
    .update(incidents)
    .set({ pinned: !incident.pinned })
    .where(eq(incidents.id, data.incidentId));
  revalidateTag("incidents", "max");

  return { pinned: !incident.pinned, success: true };
};
