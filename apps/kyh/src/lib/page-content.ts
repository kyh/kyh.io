import { agentRoutes, siteConfig } from "@/lib/config";
import { workHistory } from "@/lib/data";
import { social } from "@/lib/social";

/**
 * A tiny content model for the prose pages (`/about`, `/contact`, `/privacy`,
 * `/agents`). Authoring the copy once as data means the React page and the
 * `text/markdown` representation of that page can't drift apart — the same
 * problem `connectLinks` already solves for the homepage.
 *
 * Deliberately small: prose, one level of subheading, and link lists. Inline
 * links live in `links` blocks so neither renderer has to parse markdown.
 */
export type ContentBlock =
  | { kind: "text"; text: string }
  | { kind: "subheading"; text: string }
  | { kind: "links"; items: ContentLink[] };

export interface ContentLink {
  label: string;
  href: string;
  description: string;
}

export interface ContentSection {
  id: string;
  heading: string;
  blocks: ContentBlock[];
}

export interface PageContent {
  path: string;
  title: string;
  /** Rendered as the `<h1>` and as the markdown `#` heading. */
  heading: string;
  description: string;
  intro: string[];
  sections: ContentSection[];
}

const toContentLink = (route: {
  path: string;
  title: string;
  description: string;
}): ContentLink => ({
  description: route.description,
  href: route.path,
  label: route.title,
});

export const aboutContent: PageContent = {
  description:
    "Kaiyu Hsu (Kai): Technical Staff at Sequoia Capital, previously Vercel, Google and Amazon.",
  heading: "About Kaiyu Hsu",
  intro: [
    "Hello world. You can call me Kai. I enjoy creating things for the internet, usually somewhere between design and engineering.",
  ],
  path: "/about",
  sections: [
    {
      blocks: [
        {
          kind: "text",
          text: "I'm Technical Staff at Sequoia Capital: investing, advising, and building products you may not have heard of, yet.",
        },
        { kind: "subheading", text: "Before that" },
        {
          items: workHistory.slice(1).map((work) => ({
            description: `${work.role}.`,
            href: work.link,
            label: work.company,
          })),
          kind: "links",
        },
      ],
      heading: "Work",
      id: "work",
    },
    {
      blocks: [
        {
          kind: "text",
          text: "I ship small projects constantly. Beyond that I read about economics, psychology and business, draw, and design games. But honestly, I spend most of my days procrastinating.",
        },
        {
          items: [
            { description: "Everything I've built.", href: "/showcase", label: "Showcase" },
            { description: "How to reach me.", href: "/contact", label: "Contact" },
          ],
          kind: "links",
        },
      ],
      heading: "Outside work",
      id: "outside",
    },
  ],
  title: "About",
};

export const contactContent: PageContent = {
  description: `Reach Kaiyu Hsu by email at ${siteConfig.email}, or on GitHub, X, LinkedIn and Dribbble.`,
  heading: "Contact Kaiyu Hsu",
  intro: [
    `Email is best: ${siteConfig.email}. I read everything and reply to most things within a few days. If it's been a week, nudge me. I'm in San Francisco, on Pacific time.`,
  ],
  path: "/contact",
  sections: [
    {
      blocks: [
        {
          items: [
            {
              description: "Anything substantive.",
              href: `mailto:${siteConfig.email}`,
              label: "Email",
            },
            { description: "Code, issues, pull requests.", href: social.github, label: "GitHub" },
            { description: "Quick questions and hellos.", href: social.twitter, label: "X" },
            { description: "Work history.", href: social.linkedin, label: "LinkedIn" },
            { description: "Design work.", href: social.dribbble, label: "Dribbble" },
          ],
          kind: "links",
        },
      ],
      heading: "Channels",
      id: "channels",
    },
    {
      blocks: [
        {
          kind: "text",
          text: "What you're building, what you've tried, and where you're stuck. Founders: a demo link beats a deck. Bug in one of my projects? Open a GitHub issue instead.",
        },
        { kind: "subheading", text: "What I skip" },
        {
          kind: "text",
          text: "Cold sales, recruiting pitches, and link requests.",
        },
      ],
      heading: "What to send",
      id: "what-to-send",
    },
  ],
  title: "Contact",
};

export const privacyContent: PageContent = {
  description:
    "What kyh.io collects (anonymous analytics and live cursors), what it doesn't, and who hosts it.",
  heading: "Privacy",
  intro: [
    "kyh.io is a personal site. No accounts, no ads, nothing to sign up for. Here's everything that gets collected.",
  ],
  path: "/privacy",
  sections: [
    {
      blocks: [
        {
          items: [
            {
              description: "Anonymous page views and rough location. No cookies.",
              href: "https://vercel.com/docs/analytics/privacy-policy",
              label: "Vercel Web Analytics",
            },
            {
              description: "How fast pages load for you.",
              href: "https://vercel.com/docs/speed-insights/privacy-policy",
              label: "Vercel Speed Insights",
            },
            {
              description:
                "Your cursor position and current page, shared with other visitors. Held in memory, never stored.",
              href: "https://github.com/kyh/kyh.io/tree/main/apps/party",
              label: "Live cursors",
            },
          ],
          kind: "links",
        },
        { kind: "subheading", text: "Not collected" },
        {
          kind: "text",
          text: "No tracking cookies, fingerprinting or session recording. Your theme choice stays in your browser.",
        },
      ],
      heading: "What's collected",
      id: "collected",
    },
    {
      blocks: [
        {
          kind: "text",
          text: `Vercel hosts the site and keeps standard server logs. Images come from Vercel Blob. Cursors run on Cloudflare. Blocking analytics breaks nothing. Questions or removal requests: ${siteConfig.email}.`,
        },
      ],
      heading: "Who processes it",
      id: "processors",
    },
  ],
  title: "Privacy",
};

export const agentsContent: PageContent = {
  description:
    "Machine-readable endpoints for kyh.io: llms.txt, markdown, OpenAPI, API catalog, sitemap and robots.txt, plus the npx kyh CLI.",
  heading: "Agent resources for kyh.io",
  intro: ["Every page here is server-rendered and readable by software. Start with llms.txt."],
  path: "/agents",
  sections: [
    {
      blocks: [
        { items: agentRoutes.map(toContentLink), kind: "links" },
        { kind: "subheading", text: "Content negotiation" },
        {
          kind: "text",
          text: "Send `Accept: text/markdown` to / and you get markdown. Unknown paths return a real 404. Every endpoint is a read-only GET, no auth.",
        },
      ],
      heading: "Endpoints",
      id: "endpoints",
    },
    {
      blocks: [
        {
          items: [
            {
              description: "This site in your terminal: `npx kyh`.",
              href: "https://www.npmjs.com/package/kyh",
              label: "kyh on npm",
            },
            {
              description: "Source for the site and the CLI.",
              href: "https://github.com/kyh/kyh.io",
              label: "kyh/kyh.io",
            },
          ],
          kind: "links",
        },
        {
          kind: "text",
          text: "Crawl it, quote it, train on it. robots.txt says so.",
        },
      ],
      heading: "Elsewhere",
      id: "elsewhere",
    },
  ],
  title: "For agents",
};

export const prosePages: PageContent[] = [
  aboutContent,
  contactContent,
  privacyContent,
  agentsContent,
];
