export const siteConfig = {
  creator: "@kaiyuhsu",
  description:
    "Kaiyu Hsu (Kai, @kyh) works on engineering and research at Sequoia Capital. Previously Vercel, Google and Amazon. Builds Vibedgames, UICapsule, Yours Sincerely and more.",
  email: "kai@kyh.io",
  name: "Kaiyu Hsu",
  shortName: "kyh",
  /** The site, as distinct from `name` — the person. */
  siteName: "kyh.io",
  /** The homepage and share-card title: the name plus what sets it apart in search. */
  title: "Kaiyu Hsu — Engineering & Research at Sequoia",
  url: process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://www.kyh.io",
};

export interface SiteRoute {
  path: string;
  title: string;
  description: string;
}

/**
 * Single source of truth for the canonical HTML routes. Drives `sitemap.xml`,
 * `llms.txt`, the site nav on the homepage and the 404 recovery links, so a new
 * page can't be discoverable in one place and invisible in another.
 */
export const siteRoutes: SiteRoute[] = [
  {
    description: "Who I am, what I've shipped, and every way to reach me.",
    path: "/",
    title: "Home",
  },
  {
    description: "Short bio: current role, past work, and side projects.",
    path: "/about",
    title: "About",
  },
  {
    description: "Ventures, projects, mini apps and templates.",
    path: "/showcase",
    title: "Showcase",
  },
  {
    description: "Machine-readable endpoints, content negotiation, and the `npx kyh` CLI.",
    path: "/agents",
    title: "For agents",
  },
  {
    description: "Email and social channels, and what to send.",
    path: "/contact",
    title: "Contact",
  },
  {
    description: "What this site collects, what it doesn't, and who processes it.",
    path: "/privacy",
    title: "Privacy",
  },
  {
    description: "The bio streamed one word at a time (rapid serial visual presentation).",
    path: "/rsvp",
    title: "Speed read",
  },
];

/**
 * Machine-readable views of the same content. Kept next to `siteRoutes` because
 * `llms.txt`, `/agents` and the 404 body all advertise both lists.
 */
export const agentRoutes: SiteRoute[] = [
  {
    description: "The agent index for this site, including when to use it.",
    path: "/llms.txt",
    title: "llms.txt",
  },
  {
    description:
      "The homepage as `text/markdown`. Also served from `/` when you send `Accept: text/markdown`.",
    path: "/markdown",
    title: "Markdown view",
  },
  {
    description: "Every canonical URL on this site.",
    path: "/sitemap.xml",
    title: "Sitemap",
  },
  {
    description: "Crawl rules plus Content-Signal AI usage preferences.",
    path: "/robots.txt",
    title: "robots.txt",
  },
  {
    description: "OpenAPI 3.1 description of every machine-readable endpoint listed here.",
    path: "/openapi.json",
    title: "OpenAPI",
  },
  {
    description: "RFC 9727 API catalog linking to the OpenAPI description.",
    path: "/.well-known/api-catalog",
    title: "API catalog",
  },
];

/** `/` collapses to the bare origin, so canonical URLs have no trailing slash. */
export const absoluteUrl = (path: string) =>
  path === "/" ? siteConfig.url : `${siteConfig.url}${path}`;
