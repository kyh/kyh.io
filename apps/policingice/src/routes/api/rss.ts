import { createFileRoute } from "@tanstack/react-router";
import { desc } from "drizzle-orm";

import { db } from "@/db/index";

const siteUrl = "https://policingice.com";

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
      GET: async () => {
        const results = await db.query.incidents.findMany({
          with: { videos: true },
          where: (inc, { and, eq: eqOp, isNull: isNullOp, lt: ltOp }) =>
            and(
              eqOp(inc.status, "approved"),
              isNullOp(inc.deletedAt),
              ltOp(inc.reportCount, 3),
            ),
          orderBy: (inc) => [desc(inc.createdAt)],
          limit: 100,
        });

        const lastBuildDate = results[0]?.createdAt
          ? new Date(results[0].createdAt).toUTCString()
          : new Date().toUTCString();

        const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Policing ICE</title>
    <link>${siteUrl}</link>
    <description>Documenting incidents of ICE overreach</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${siteUrl}/api/rss" rel="self" type="application/rss+xml"/>
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
