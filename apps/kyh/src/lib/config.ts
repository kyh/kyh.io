export const siteConfig = {
  name: "Kaiyu Hsu",
  shortName: "kyh",
  /** The site, as distinct from `name` — the person. */
  siteName: "kyh.io",
  description:
    "Building things for the interwebs. By day, I get to do that through investing, advising, and working on products you may not have heard of (yet)",
  url: process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://www.kyh.io",
  creator: "@kaiyuhsu",
  email: "hello@kyh.io",
  /** Where I am. Used by the PST clock on the homepage and by structured data. */
  location: {
    city: "San Francisco",
    region: "CA",
    country: "US",
  },
};

export type SiteRoute = {
  path: string;
  title: string;
  description: string;
};

/**
 * Single source of truth for the canonical HTML routes. Drives `sitemap.xml`,
 * `llms.txt`, the site nav on the homepage and the 404 recovery links, so a new
 * page can't be discoverable in one place and invisible in another.
 */
export const siteRoutes: SiteRoute[] = [
  {
    path: "/",
    title: "Home",
    description: "Who I am, what I've shipped, and every way to reach me.",
  },
  {
    path: "/about",
    title: "About",
    description: "Long-form background: the roles, the research, and the work I take on.",
  },
  {
    path: "/showcase",
    title: "Showcase",
    description: "Ventures, projects, mini apps and templates, with links to each one.",
  },
  {
    path: "/developers",
    title: "Developers",
    description:
      "Machine-readable endpoints, the `npx kyh` CLI, and how an agent should read this site.",
  },
  {
    path: "/contact",
    title: "Contact",
    description: "Email and social channels, what to send, and what to expect back.",
  },
  {
    path: "/privacy",
    title: "Privacy",
    description: "What this site collects, what it doesn't, and who processes it.",
  },
  {
    path: "/rsvp",
    title: "Speed read",
    description: "The bio streamed one word at a time (rapid serial visual presentation).",
  },
];

/**
 * Machine-readable views of the same content. Kept next to `siteRoutes` because
 * `llms.txt`, `/developers` and the 404 body all advertise both lists.
 */
export const agentRoutes: SiteRoute[] = [
  {
    path: "/llms.txt",
    title: "llms.txt",
    description: "The agent index for this site, including when to use it.",
  },
  {
    path: "/markdown",
    title: "Markdown view",
    description:
      "The homepage as `text/markdown`. Also served from `/` when you send `Accept: text/markdown`.",
  },
  {
    path: "/sitemap.xml",
    title: "Sitemap",
    description: "Every canonical URL on this site.",
  },
  {
    path: "/robots.txt",
    title: "robots.txt",
    description: "Crawl rules plus Content-Signal AI usage preferences.",
  },
];

/** `/` collapses to the bare origin, so canonical URLs have no trailing slash. */
export const absoluteUrl = (path: string) =>
  path === "/" ? siteConfig.url : `${siteConfig.url}${path}`;
