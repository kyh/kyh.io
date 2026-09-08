import { desc, lt } from "drizzle-orm";

import { db } from "@/db/drizzle-client";
import { incidents } from "@/db/drizzle-schema";

const siteUrl = "https://policingice.com";
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

const escapeXml = (str: string | null | undefined): string => {
  if (!str) {
    return "";
  }
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
};

const formatRFC2822 = (date: Date): string => date.toUTCString();

const formatReadableDate = (date: Date): string => {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
};

const feedUrl = (page: number, limit: number, before: string | null) => {
  const params = new URLSearchParams();
  if (limit !== DEFAULT_LIMIT) {
    params.set("limit", String(limit));
  }
  if (page > 1) {
    params.set("page", String(page));
  }
  if (before) {
    params.set("before", before);
  }
  return params.toString() ? `${siteUrl}/api/rss?${params}` : `${siteUrl}/api/rss`;
};

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const pageParam = url.searchParams.get("page");
  const beforeParam = url.searchParams.get("before");

  const limit = Math.min(
    Math.max(1, Math.trunc(Number(limitParam ?? "")) || DEFAULT_LIMIT),
    MAX_LIMIT,
  );
  const page = Math.max(1, Math.trunc(Number(pageParam ?? "")) || 1);
  const offset = (page - 1) * limit;
  const beforeDate = beforeParam ? new Date(beforeParam) : null;

  const results = await db.query.incidents.findMany({
    limit,
    offset,
    orderBy: (inc) => [desc(inc.createdAt)],
    where: (inc, { and: andOp, eq: eqOp, isNull: isNullOp, lt: ltOp }) =>
      andOp(
        eqOp(inc.status, "approved"),
        isNullOp(inc.deletedAt),
        ltOp(inc.reportCount, 3),
        beforeDate && !Number.isNaN(beforeDate.getTime())
          ? lt(incidents.createdAt, beforeDate)
          : undefined,
      ),
    with: { videos: true },
  });

  const lastBuildDate = results[0]?.createdAt
    ? new Date(results[0].createdAt).toUTCString()
    : new Date().toUTCString();

  const selfUrl = feedUrl(page, limit, beforeParam);
  const nextUrl = results.length === limit ? feedUrl(page + 1, limit, beforeParam) : null;
  const prevUrl = page > 1 ? feedUrl(page - 1, limit, beforeParam) : null;

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Policing ICE${page > 1 ? ` (Page ${page})` : ""}</title>
    <link>${siteUrl}</link>
    <description>Documenting incidents of ICE overreach</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${selfUrl}" rel="self" type="application/rss+xml"/>${nextUrl ? `\n    <atom:link href="${nextUrl}" rel="next" type="application/rss+xml"/>` : ""}${prevUrl ? `\n    <atom:link href="${prevUrl}" rel="previous" type="application/rss+xml"/>` : ""}
${results
  .map((incident) => {
    const incidentDateObj = incident.incidentDate ? new Date(incident.incidentDate) : null;
    const createdDateObj = incident.createdAt ? new Date(incident.createdAt) : null;
    const pubDate = incidentDateObj ?? createdDateObj;
    const pubDateStr = pubDate ? formatRFC2822(pubDate) : "";

    const dateStr = incidentDateObj ? formatReadableDate(incidentDateObj) : null;
    const location = incident.location ?? "Unknown Location";
    const title = dateStr ? `${dateStr} - ${escapeXml(location)}` : escapeXml(location);

    const description = escapeXml(incident.description);

    const mediaContent =
      incident.videos.length > 0
        ? `\n${incident.videos
            .map(
              (v) =>
                `      <media:content url="${escapeXml(v.url)}" medium="video" type="text/html">
        <media:credit>${escapeXml(v.platform)}</media:credit>
      </media:content>`,
            )
            .join("\n")}`
        : "";

    return `    <item>
      <title>${title}</title>
      <link>${siteUrl}/incident/${incident.id}</link>
      <guid isPermaLink="true">${siteUrl}/incident/${incident.id}</guid>
      <pubDate>${pubDateStr}</pubDate>
      <description>${description}</description>${mediaContent}
    </item>`;
  })
  .join("\n")}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
};
