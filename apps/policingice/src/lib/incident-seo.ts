import { formatDate } from "@/lib/format";
import { siteDescription, siteName, siteUrl } from "@/lib/site";

/** What an incident page's metadata reads: never its footage. */
export interface IncidentSummary {
  id: number;
  description: string | null;
  location: string | null;
  incidentDate: Date | null;
  createdAt: Date | null;
}

const MAX_DESCRIPTION = 160;

const clip = (text: string, max: number) =>
  text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;

export const incidentPath = (id: number) => `/incident/${id}`;

/** "Incident in Chicago, IL · Jan 5, 2026", or as much of it as is known. */
export const incidentTitle = (incident: IncidentSummary) => {
  const place = incident.location?.trim();
  const date = formatDate(incident.incidentDate ?? incident.createdAt);
  const head = place ? `Incident in ${place}` : `Incident #${incident.id}`;
  return date ? `${head} · ${date}` : head;
};

export const incidentDescription = (incident: IncidentSummary) => {
  const text = incident.description?.replaceAll(/\s+/gu, " ").trim();
  return clip(
    text && text.length > 0 ? text : `A documented incident of ICE activity on ${siteName}.`,
    MAX_DESCRIPTION,
  );
};

/**
 * JSON-LD for an incident page: a report (`Article`) about the incident, where
 * and when it happened, and the trail back to the feed. No image or video: the
 * footage stays on the page, out of search cards and previews.
 */
export const incidentJsonLd = (incident: IncidentSummary) => {
  const url = `${siteUrl}${incidentPath(incident.id)}`;
  const happened = incident.incidentDate ?? incident.createdAt;
  const place = incident.location?.trim();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@id": `${url}#article`,
        "@type": "Article",
        // Left undefined when unknown: JSON.stringify drops the key.
        contentLocation: place ? { "@type": "Place", name: place } : undefined,
        dateCreated: happened?.toISOString(),
        datePublished: incident.createdAt?.toISOString(),
        description: incidentDescription(incident),
        headline: incidentTitle(incident),
        inLanguage: "en-US",
        isPartOf: { "@id": `${siteUrl}/#website` },
        mainEntityOfPage: url,
        publisher: { "@id": `${siteUrl}/#organization` },
        url,
      },
      {
        "@id": `${url}#breadcrumb`,
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", item: siteUrl, name: siteName, position: 1 },
          { "@type": "ListItem", item: url, name: incidentTitle(incident), position: 2 },
        ],
      },
    ],
  } as const;
};

interface JsonLdGraph {
  "@context": "https://schema.org";
  "@graph": readonly unknown[];
}

/** The site's own graph, on every page. */
export const siteJsonLd: JsonLdGraph = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@id": `${siteUrl}/#organization`,
      "@type": "Organization",
      description: siteDescription,
      logo: `${siteUrl}/favicon/web-app-manifest-512x512.png`,
      name: siteName,
      url: siteUrl,
    },
    {
      "@id": `${siteUrl}/#website`,
      "@type": "WebSite",
      description: siteDescription,
      inLanguage: "en-US",
      name: siteName,
      publisher: { "@id": `${siteUrl}/#organization` },
      url: siteUrl,
    },
  ],
};

/** Escapes `<` so no value (an incident's description) can close the inline script early. */
export const serializeJsonLd = (data: JsonLdGraph) =>
  JSON.stringify(data).replaceAll("<", String.raw`\u003c`);
