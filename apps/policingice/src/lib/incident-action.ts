"use server";

import { revalidateTag } from "next/cache";
import { embed } from "ai";
import { and, desc, eq, gte, like, lt, lte, sql } from "drizzle-orm";
import { z } from "zod";

import { client, db } from "@/db/drizzle-client";
import { incidents, videos, votes } from "@/db/drizzle-schema";

import type { VoteType } from "@/db/drizzle-schema";

import { getSession } from "@/lib/auth";
import { getIncidents as getCachedIncidents } from "@/lib/incident-query";
import { detectPlatform, resolveVideoUrl } from "@/lib/video-utils";

// Raw row contract for the vector_top_k query below: incidents.* joined with an
// optional video, all timestamps as unix seconds. Parsed at the SQL boundary.
const vectorRowSchema = z.object({
  created_at: z.number().nullable(),
  deleted_at: z.number().nullable(),
  description: z.string().nullable(),
  // Opaque F32_BLOB passed through untouched; never inspected here.
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
  if (!session?.user || session.user.isAnonymous) {
    throw new Error("Unauthorized");
  }
  return session.user;
};

// Parse date string as local time (not UTC)
const parseLocalDate = (dateStr: string): Date => {
  const parts = dateStr.split("-").map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
};

// Server action wrapper — delegates to cached query so clients can call it
export const getIncidents = async (data: { offset?: number; limit?: number }) =>
  await getCachedIncidents(data);

export const searchIncidents = async (data: {
  query?: string;
  startDate?: string;
  endDate?: string;
}) => {
  const baseConditions = [
    eq(incidents.status, "approved"),
    sql`${incidents.deletedAt} IS NULL`,
    lt(incidents.reportCount, 3),
  ];

  if (data.startDate) {
    const start = parseLocalDate(data.startDate);
    baseConditions.push(gte(incidents.incidentDate, start));
  }

  if (data.endDate) {
    const end = parseLocalDate(data.endDate);
    end.setDate(end.getDate() + 1);
    baseConditions.push(lte(incidents.incidentDate, end));
  }

  // No text query - just date filters
  if (!data.query) {
    const results = await db.query.incidents.findMany({
      limit: 50,
      orderBy: [desc(sql`IFNULL(${incidents.incidentDate}, 9999999999)`), desc(incidents.id)],
      where: and(...baseConditions),
      with: { videos: true },
    });
    return { incidents: results };
  }

  // Text query - do both keyword and vector search, combine results
  const resultMap = new Map<
    number,
    Awaited<ReturnType<typeof db.query.incidents.findMany>>[0] & {
      videos: (typeof videos.$inferSelect)[];
      _score: number;
    }
  >();

  // 1. Keyword search (always works, even without embeddings)
  const q = `%${data.query}%`;
  const keywordConditions = [
    ...baseConditions,
    sql`(${like(incidents.location, q)} OR ${like(incidents.description, q)})`,
  ];

  const keywordResults = await db.query.incidents.findMany({
    limit: 30,
    orderBy: [desc(sql`IFNULL(${incidents.incidentDate}, 9999999999)`), desc(incidents.id)],
    where: and(...keywordConditions),
    with: { videos: true },
  });

  // Add keyword results with score based on position
  for (const [idx, incident] of keywordResults.entries()) {
    resultMap.set(incident.id, { ...incident, _score: 100 - idx });
  }

  // 2. Vector search (only if we have embeddings)
  try {
    const { embedding } = await embed({
      model: "openai/text-embedding-3-small",
      value: data.query,
    });
    const vectorStr = `[${embedding.join(",")}]`;

    // Build date conditions for SQL
    let dateConditions = "";
    const args: (string | number)[] = [vectorStr];
    if (data.startDate) {
      const start = Math.floor(parseLocalDate(data.startDate).getTime() / 1000);
      dateConditions += " AND i.incident_date >= ?";
      args.push(start);
    }
    if (data.endDate) {
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

    // Group videos and merge with existing results
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
            createdAt: row.created_at ? new Date(row.created_at * 1000) : null,
            deletedAt: row.deleted_at ? new Date(row.deleted_at * 1000) : null,
            description: row.description,
            embedding: row.embedding,
            id,
            incidentDate: row.incident_date ? new Date(row.incident_date * 1000) : null,
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
      if (row.vid && row.url && row.platform) {
        entry.incident.videos.push({
          createdAt: row.v_created_at ? new Date(row.v_created_at * 1000) : null,
          id: row.vid,
          incidentId: id,
          platform: row.platform,
          url: row.url,
        });
      }
    }

    // Merge vector results - boost score if also in keyword results
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
  } catch {
    // Vector search failed (no index, no embeddings, etc) - keyword results only
  }

  // Sort by combined score
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
  if (!session?.user.id) {
    return {};
  }

  const userVotes = await db.query.votes.findMany({
    where: (v, { and: andOp, eq: eqOp, inArray }) =>
      andOp(eqOp(v.sessionId, session.user.id), inArray(v.incidentId, data.incidentIds)),
  });

  const byIncident: Record<number, VoteType> = {};
  for (const vote of userVotes) {
    byIncident[vote.incidentId] = vote.type;
  }
  return byIncident;
};

export const getUserVote = async (data: { incidentId: number }) => {
  const session = await getSession();
  if (!session?.user.id) {
    return null;
  }

  const vote = await db.query.votes.findFirst({
    where: (v, { and: andOp, eq: eqOp }) =>
      andOp(eqOp(v.sessionId, session.user.id), eqOp(v.incidentId, data.incidentId)),
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
  if (!session?.user.id) {
    return { error: "Unauthorized", incident: null };
  }

  // Resolve all URLs (e.g., Twitter /i/status/ URLs to embeddable format)
  const resolvedUrls = await Promise.all(data.videoUrls.map(resolveVideoUrl));

  const existingVideos = await db.query.videos.findMany({
    where: (v, { inArray }) => inArray(v.url, resolvedUrls),
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
      incidentDate: data.incidentDate ? parseLocalDate(data.incidentDate) : new Date(),
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
  if (!session?.user.id) {
    return { error: "No session", success: false };
  }

  const sessionId = session.user.id;

  const existing = await db.query.votes.findFirst({
    where: (v, { and: andOp, eq: eqOp }) =>
      andOp(eqOp(v.sessionId, sessionId), eqOp(v.incidentId, data.incidentId)),
  });

  // Toggle: if same vote type, remove it
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

  // If different vote type exists, switch it
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

  // New vote
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
  if (!session?.user.id) {
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
  if (!session?.user.id) {
    return { error: "Unauthorized", success: false };
  }

  await db
    .update(incidents)
    .set({
      description: data.description ?? null,
      incidentDate: data.incidentDate ? parseLocalDate(data.incidentDate) : null,
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
    where: eq(incidents.id, data.incidentId),
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
