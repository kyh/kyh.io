"use server";

import { headers } from "next/headers";
import { revalidateTag } from "next/cache";
import { embed } from "ai";
import { and, desc, eq, gte, like, lt, lte, sql } from "drizzle-orm";

import { client, db } from "@/db/index";
import { incidents, videos, votes } from "@/db/schema";
import { auth } from "@/lib/auth";
import { detectPlatform, resolveVideoUrl } from "@/lib/video-utils";
import { getIncidents as getCachedIncidents } from "@/lib/incident-query";

// Parse date string as local time (not UTC)
function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split("-").map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

// Server action wrapper — delegates to cached query so clients can call it
export async function getIncidents(data: {
  offset?: number;
  limit?: number;
}) {
  return getCachedIncidents(data);
}

export async function searchIncidents(data: {
  query?: string;
  startDate?: string;
  endDate?: string;
}) {
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
      with: { videos: true },
      where: and(...baseConditions),
      orderBy: [
        desc(sql`IFNULL(${incidents.incidentDate}, 9999999999)`),
        desc(incidents.id),
      ],
      limit: 50,
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
    with: { videos: true },
    where: and(...keywordConditions),
    orderBy: [
      desc(sql`IFNULL(${incidents.incidentDate}, 9999999999)`),
      desc(incidents.id),
    ],
    limit: 30,
  });

  // Add keyword results with score based on position
  keywordResults.forEach((incident, idx) => {
    resultMap.set(incident.id, { ...incident, _score: 100 - idx });
  });

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
      const start = Math.floor(
        parseLocalDate(data.startDate).getTime() / 1000,
      );
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
      args,
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

    for (const row of vectorResult.rows) {
      const id = row.id as number;
      if (!vectorIncidents.has(id)) {
        vectorIncidents.set(id, {
          incident: {
            id,
            location: row.location as string | null,
            description: row.description as string | null,
            embedding: row.embedding as Buffer | null,
            incidentDate: row.incident_date
              ? new Date((row.incident_date as number) * 1000)
              : null,
            status: row.status as "approved" | "hidden",
            pinned: (row.pinned as number) === 1,
            unjustifiedCount: row.unjustified_count as number,
            justifiedCount: row.justified_count as number,
            reportCount: row.report_count as number,
            createdAt: row.created_at
              ? new Date((row.created_at as number) * 1000)
              : null,
            deletedAt: row.deleted_at
              ? new Date((row.deleted_at as number) * 1000)
              : null,
            videos: [],
          },
          distance: row.vec_distance as number,
        });
      }
      if (row.vid) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        vectorIncidents.get(id)!.incident.videos.push({
          id: row.vid as number,
          incidentId: id,
          url: row.url as string,
          platform: row.platform as
            | "twitter"
            | "youtube"
            | "tiktok"
            | "facebook"
            | "instagram"
            | "linkedin"
            | "pinterest"
            | "reddit",
          createdAt: row.v_created_at
            ? new Date((row.v_created_at as number) * 1000)
            : null,
        });
      }
    }

    // Merge vector results - boost score if also in keyword results
    let idx = 0;
    for (const [id, { incident, distance }] of vectorIncidents) {
      const vectorScore = 100 - idx - distance * 10;
      if (resultMap.has(id)) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        resultMap.get(id)!._score += vectorScore;
      } else {
        resultMap.set(id, { ...incident, _score: vectorScore });
      }
      idx++;
    }
  } catch {
    // Vector search failed (no index, no embeddings, etc) - keyword results only
  }

  // Sort by combined score
  const sortedResults = Array.from(resultMap.values())
    .sort((a, b) => b._score - a._score)
    .slice(0, 50)
    .map(({ _score, ...incident }) => incident);

  return { incidents: sortedResults };
}

export async function getUserVotes(data: { incidentIds: number[] }) {
  if (data.incidentIds.length === 0) return {};

  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session?.user.id) return {};

  const userVotes = await db.query.votes.findMany({
    where: (votes, { and, eq: eqOp, inArray }) =>
      and(
        eqOp(votes.sessionId, session.user.id),
        inArray(votes.incidentId, data.incidentIds),
      ),
  });

  return userVotes.reduce(
    (acc, vote) => {
      acc[vote.incidentId] = vote.type;
      return acc;
    },
    {} as Record<number, "unjustified" | "justified">,
  );
}

export async function getUserVote(data: {
  sessionId: string;
  incidentId: number;
}) {
  if (!data.sessionId) return null;

  const vote = await db.query.votes.findFirst({
    where: (votes, { and, eq: eqOp }) =>
      and(
        eqOp(votes.sessionId, data.sessionId),
        eqOp(votes.incidentId, data.incidentId),
      ),
  });

  return vote?.type ?? null;
}

export async function createIncident(data: {
  location?: string;
  description?: string;
  incidentDate?: string;
  videoUrls: string[];
}) {
  // Resolve all URLs (e.g., Twitter /i/status/ URLs to embeddable format)
  const resolvedUrls = await Promise.all(data.videoUrls.map(resolveVideoUrl));

  const existingVideos = await db.query.videos.findMany({
    where: (videos, { inArray }) => inArray(videos.url, resolvedUrls),
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
          url,
          platform: detectPlatform(url),
        })),
      );
    }

    revalidateTag("incidents", "max");
    return {
      incident: existingIncident,
      autoApproved: true,
      merged: true,
    };
  }

  const [incident] = await db
    .insert(incidents)
    .values({
      location: data.location,
      description: data.description,
      incidentDate: data.incidentDate
        ? parseLocalDate(data.incidentDate)
        : new Date(),
      status: "approved",
    })
    .returning();

  await db.insert(videos).values(
    resolvedUrls.map((url) => ({
      incidentId: incident.id,
      url,
      platform: detectPlatform(url),
    })),
  );

  revalidateTag("incidents", "max");
  return { incident, autoApproved: true, merged: false };
}

export async function submitVote(data: {
  incidentId: number;
  type: "unjustified" | "justified";
}) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user.id) {
    return { success: false, error: "No session" };
  }

  const sessionId = session.user.id;

  const existing = await db.query.votes.findFirst({
    where: (votes, { and, eq: eqOp }) =>
      and(
        eqOp(votes.sessionId, sessionId),
        eqOp(votes.incidentId, data.incidentId),
      ),
  });

  // Toggle: if same vote type, remove it
  if (existing?.type === data.type) {
    await db.delete(votes).where(eq(votes.id, existing.id));
    const field =
      data.type === "unjustified" ? "unjustifiedCount" : "justifiedCount";
    await db
      .update(incidents)
      .set({ [field]: sql`${incidents[field]} - 1` })
      .where(eq(incidents.id, data.incidentId));
    revalidateTag("incidents", "max");
    return { success: true, action: "removed" as const };
  }

  // If different vote type exists, switch it
  if (existing) {
    const oldField =
      existing.type === "unjustified" ? "unjustifiedCount" : "justifiedCount";
    const newField =
      data.type === "unjustified" ? "unjustifiedCount" : "justifiedCount";
    await db
      .update(votes)
      .set({ type: data.type })
      .where(eq(votes.id, existing.id));
    await db
      .update(incidents)
      .set({
        [oldField]: sql`${incidents[oldField]} - 1`,
        [newField]: sql`${incidents[newField]} + 1`,
      })
      .where(eq(incidents.id, data.incidentId));
    revalidateTag("incidents", "max");
    return { success: true, action: "switched" as const };
  }

  // New vote
  await db.insert(votes).values({
    incidentId: data.incidentId,
    sessionId,
    type: data.type,
  });

  const field =
    data.type === "unjustified" ? "unjustifiedCount" : "justifiedCount";
  await db
    .update(incidents)
    .set({ [field]: sql`${incidents[field]} + 1` })
    .where(eq(incidents.id, data.incidentId));

  revalidateTag("incidents", "max");
  return { success: true, action: "added" as const };
}

export async function reportIncident(data: { incidentId: number }) {
  await db
    .update(incidents)
    .set({ reportCount: sql`${incidents.reportCount} + 1` })
    .where(eq(incidents.id, data.incidentId));
  revalidateTag("incidents", "max");
  return { success: true };
}

export async function addVideoToIncident(data: {
  incidentId: number;
  url: string;
}) {
  const resolvedUrl = await resolveVideoUrl(data.url);
  const platform = detectPlatform(resolvedUrl);
  await db.insert(videos).values({
    incidentId: data.incidentId,
    url: resolvedUrl,
    platform,
  });
  revalidateTag("incidents", "max");
  return { success: true };
}

export async function updateIncidentDetails(data: {
  incidentId: number;
  location?: string;
  description?: string;
  incidentDate?: string;
}) {
  await db
    .update(incidents)
    .set({
      location: data.location ?? null,
      description: data.description ?? null,
      incidentDate: data.incidentDate
        ? parseLocalDate(data.incidentDate)
        : null,
    })
    .where(eq(incidents.id, data.incidentId));
  revalidateTag("incidents", "max");
  return { success: true };
}

export async function hideIncident(data: { incidentId: number }) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session?.user || session.user.isAnonymous)
    return { success: false, error: "Unauthorized" };

  await db
    .update(incidents)
    .set({ deletedAt: new Date() })
    .where(eq(incidents.id, data.incidentId));
  revalidateTag("incidents", "max");
  return { success: true };
}

export async function deleteIncident(data: { incidentId: number }) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session?.user || session.user.isAnonymous)
    return { success: false, error: "Unauthorized" };

  await db.delete(incidents).where(eq(incidents.id, data.incidentId));
  revalidateTag("incidents", "max");
  return { success: true };
}

export async function togglePinIncident(data: { incidentId: number }) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session?.user || session.user.isAnonymous)
    return { success: false, error: "Unauthorized" };

  const incident = await db.query.incidents.findFirst({
    where: eq(incidents.id, data.incidentId),
  });
  if (!incident) return { success: false, error: "Not found" };

  await db
    .update(incidents)
    .set({ pinned: !incident.pinned })
    .where(eq(incidents.id, data.incidentId));
  revalidateTag("incidents", "max");
  return { success: true, pinned: !incident.pinned };
}
