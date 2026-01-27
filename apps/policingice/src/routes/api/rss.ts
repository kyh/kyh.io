import { createFileRoute } from "@tanstack/react-router";
import { desc, lt } from "drizzle-orm";

import { db } from "@/db/index";
import { incidents } from "@/db/schema";

const siteUrl = "https://policingice.com";
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

function escapeXml(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatRFC2822(date: Date): string {
  return date.toUTCString();
}

function formatReadableDate(date: Date): string {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

export const Route = createFileRoute("/api/rss")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const limitParam = url.searchParams.get("limit");
        const pageParam = url.searchParams.get("page");
        const beforeParam = url.searchParams.get("before");

        const limit = Math.min(
          Math.max(1, parseInt(limitParam ?? "", 10) || DEFAULT_LIMIT),
          MAX_LIMIT,
        );
        const page = Math.max(1, parseInt(pageParam ?? "", 10) || 1);
        const offset = (page - 1) * limit;
        const beforeDate = beforeParam ? new Date(beforeParam) : null;

        const results = await db.query.incidents.findMany({
          with: { videos: true },
          where: (inc, { and: andOp, eq: eqOp, isNull: isNullOp, lt: ltOp }) =>
            andOp(
              eqOp(inc.status, "approved"),
              isNullOp(inc.deletedAt),
              ltOp(inc.reportCount, 3),
              beforeDate && !isNaN(beforeDate.getTime())
                ? lt(incidents.createdAt, beforeDate)
                : undefined,
            ),
          orderBy: (inc) => [desc(inc.createdAt)],
          limit,
          offset,
        });

        const lastBuildDate = results[0]?.createdAt
          ? new Date(results[0].createdAt).toUTCString()
          : new Date().toUTCString();

        // Build self URL with current params
        const selfParams = new URLSearchParams();
        if (limit !== DEFAULT_LIMIT) selfParams.set("limit", String(limit));
        if (page > 1) selfParams.set("page", String(page));
        if (beforeParam) selfParams.set("before", beforeParam);
        const selfUrl = selfParams.toString()
          ? `${siteUrl}/api/rss?${selfParams}`
          : `${siteUrl}/api/rss`;

        // Build next page URL if we have results
        const nextParams = new URLSearchParams();
        if (limit !== DEFAULT_LIMIT) nextParams.set("limit", String(limit));
        nextParams.set("page", String(page + 1));
        if (beforeParam) nextParams.set("before", beforeParam);
        const nextUrl =
          results.length === limit ? `${siteUrl}/api/rss?${nextParams}` : null;

        // Build prev page URL if not on first page
        const prevParams = new URLSearchParams();
        if (limit !== DEFAULT_LIMIT) prevParams.set("limit", String(limit));
        if (page > 2) prevParams.set("page", String(page - 1));
        if (beforeParam) prevParams.set("before", beforeParam);
        const prevUrl =
          page > 1
            ? `${siteUrl}/api/rss${prevParams.toString() ? `?${prevParams}` : ""}`
            : null;

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
    const incidentDateObj = incident.incidentDate
      ? new Date(incident.incidentDate)
      : null;
    const createdDateObj = incident.createdAt
      ? new Date(incident.createdAt)
      : null;
    const pubDate = incidentDateObj ?? createdDateObj;
    const pubDateStr = pubDate ? formatRFC2822(pubDate) : "";

    const dateStr = incidentDateObj
      ? formatReadableDate(incidentDateObj)
      : null;
    const location = incident.location ?? "Unknown Location";
    const title = dateStr
      ? `${dateStr} - ${escapeXml(location)}`
      : escapeXml(location);

    const description = escapeXml(incident.description);

    const mediaContent =
      incident.videos.length > 0
        ? "\n" +
          incident.videos
            .map(
              (v) =>
                `      <media:content url="${escapeXml(v.url)}" medium="video" type="text/html">
        <media:credit>${escapeXml(v.platform)}</media:credit>
      </media:content>`,
            )
            .join("\n")
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
            "Content-Type": "application/rss+xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
