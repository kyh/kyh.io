import { agentRoutes, siteConfig, siteRoutes } from "@/lib/config";
import { social } from "@/lib/social";

/**
 * A tiny content model for the prose pages (`/about`, `/contact`, `/privacy`,
 * `/developers`). Authoring the copy once as data means the React page and the
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

export type ContentLink = {
  label: string;
  href: string;
  description: string;
};

export type ContentSection = {
  id: string;
  heading: string;
  blocks: ContentBlock[];
};

export type PageContent = {
  path: string;
  title: string;
  /** Rendered as the `<h1>` and as the markdown `#` heading. */
  heading: string;
  description: string;
  intro: string[];
  sections: ContentSection[];
};

const toContentLink = (route: {
  path: string;
  title: string;
  description: string;
}): ContentLink => ({
  label: route.title,
  href: route.path,
  description: route.description,
});

export const aboutContent: PageContent = {
  path: "/about",
  title: "About",
  heading: "About Kaiyu Hsu",
  description:
    "Kaiyu Hsu (Kai) is a Technical Staff member at Sequoia Capital who has built and shipped software at Vercel, Google and Amazon.",
  intro: [
    "Hello world. You can call me Kai since we're pretty much friends now. I'm an engineer, designer and investor based in San Francisco, and kyh.io is my corner of the web — the durable version of a business card, a portfolio and a lab notebook rolled into one.",
    "I've spent my career in the space between design and infrastructure: making interfaces that feel obvious, and making the systems underneath them fast enough that the interface stays obvious under load. That has looked like frontend framework work at Amazon, design engineering at Google, developer experience at Vercel, and now technical work alongside founders at Sequoia Capital.",
  ],
  sections: [
    {
      id: "work",
      heading: "What I do",
      blocks: [
        {
          kind: "text",
          text: "Today I'm Technical Staff at Sequoia Capital, where I work with founders on the technical side of company building — architecture reviews, early hiring, prototyping, and the unglamorous work of turning a demo into something that survives its first thousand users. Before that I was a software engineer at Vercel, a design engineer at Google, and a software engineer at Amazon, where I helped build the frontend framework behind the retail experience used by the world's largest retailer.",
        },
        {
          kind: "subheading",
          text: "Earlier",
        },
        {
          kind: "text",
          text: "I've taken startups through the full range of outcomes: an acquisition at Cardiogram, where I was a design engineer and co-authored published research on growth and retention; a public listing at Slyce; and a shutdown at Atrium. The failures taught more than the exits did. I'm also a contributing member of the U.S. Digital Response and the OpenJS Foundation.",
        },
      ],
    },
    {
      id: "building",
      heading: "What I build",
      blocks: [
        {
          kind: "text",
          text: "Outside of work I ship small things constantly: a game studio for agents, a letter-writing site that erases itself, a component library, a compensation calculator, a realtime trading game, and a pile of forkable AI-native Next.js templates. Most of them are live, most of them are open, and all of them are listed on the showcase.",
        },
        {
          kind: "text",
          text: "Beyond software I read about economics, psychology and business, draw things badly, and design games. But honestly, I spend most of my days procrastinating.",
        },
      ],
    },
    {
      id: "elsewhere",
      heading: "Elsewhere",
      blocks: [
        {
          kind: "links",
          items: [
            {
              label: "Showcase",
              href: "/showcase",
              description: "Everything I've built, with screenshots.",
            },
            { label: "Contact", href: "/contact", description: "How to get in touch." },
            {
              label: "Developers",
              href: "/developers",
              description: "Machine-readable views of this site.",
            },
            { label: "GitHub", href: social.github, description: "Open source work." },
            { label: "LinkedIn", href: social.linkedin, description: "Work history." },
          ],
        },
      ],
    },
  ],
};

export const contactContent: PageContent = {
  path: "/contact",
  title: "Contact",
  heading: "Contact Kaiyu Hsu",
  description:
    "Reach Kaiyu Hsu by email at hello@kyh.io, or through GitHub, X, LinkedIn and Dribbble.",
  intro: [
    `The fastest way to reach me is email: ${siteConfig.email}. I read everything that arrives there, and I answer most things within a few business days. If it has been longer than a week, it means the message got buried rather than ignored — a short nudge is welcome.`,
    "I'm based in San Francisco, California, and I work on Pacific time. The clock in the corner of the homepage is my local time, so you can tell at a glance whether a reply is likely in the next hour or the next morning.",
  ],
  sections: [
    {
      id: "channels",
      heading: "Channels",
      blocks: [
        {
          kind: "links",
          items: [
            {
              label: "Email",
              href: `mailto:${siteConfig.email}`,
              description: "Best for anything substantive. Goes straight to me.",
            },
            { label: "GitHub", href: social.github, description: "Issues, pull requests, code." },
            { label: "X", href: social.twitter, description: "Short questions and hellos." },
            { label: "LinkedIn", href: social.linkedin, description: "Work and hiring context." },
            { label: "Dribbble", href: social.dribbble, description: "Design work." },
          ],
        },
      ],
    },
    {
      id: "what-to-send",
      heading: "What to send",
      blocks: [
        {
          kind: "text",
          text: "Useful messages tend to include what you're building, what you've already tried, and the specific decision you're stuck on. If you're a founder, a link to a demo beats a deck. If you're reporting a bug on one of my projects, an issue on the relevant GitHub repository will get a faster answer than an email.",
        },
        {
          kind: "subheading",
          text: "What I'm slow on",
        },
        {
          kind: "text",
          text: "Cold sales outreach, unsolicited recruiting pitches for roles I haven't asked about, and requests to add links to this site. I'm not the right person for those and I'd rather say so up front than leave you waiting on a reply that isn't coming.",
        },
      ],
    },
  ],
};

export const privacyContent: PageContent = {
  path: "/privacy",
  title: "Privacy",
  heading: "Privacy",
  description:
    "What kyh.io collects, what it doesn't, and which third parties process data on its behalf.",
  intro: [
    "kyh.io is a personal website. It has no accounts, no login, no shopping cart and no newsletter, so there is nothing here for you to sign up to and nothing for me to lose. This page describes the small amount of data that does get collected when you load a page, and who touches it.",
    "The short version: I collect anonymous, aggregate traffic and performance measurements, and nothing else. I do not sell data, I do not run advertising, and I do not build profiles of visitors.",
  ],
  sections: [
    {
      id: "collected",
      heading: "What is collected",
      blocks: [
        {
          kind: "text",
          text: "Pages on this site load Vercel Web Analytics and Vercel Speed Insights. Both are privacy-preserving by design: they record page views and browser performance timings without cookies and without a persistent identifier that follows you between sites. What I see is counts — how many people visited a page, roughly where in the world they were, and how quickly the page rendered for them.",
        },
        {
          kind: "subheading",
          text: "What is not collected",
        },
        {
          kind: "text",
          text: "No advertising or cross-site tracking cookies. No fingerprinting. No session recording or heatmaps. No email addresses, unless you choose to send me one. The multiplayer cursors on the homepage broadcast an ephemeral, randomly assigned position and colour over a websocket; nothing about that connection is stored once you close the tab.",
        },
      ],
    },
    {
      id: "processors",
      heading: "Who processes it",
      blocks: [
        {
          kind: "text",
          text: "This site is hosted on Vercel, which also provides the analytics and speed measurements described above and keeps standard server logs. Project images and video are served from a public Supabase storage bucket. Realtime cursors run on Cloudflare. Each of those providers processes data under its own privacy policy in the course of delivering the page to you.",
        },
        {
          kind: "subheading",
          text: "Your choices",
        },
        {
          kind: "text",
          text: `Blocking analytics with a content blocker or a "do not track" setting will not break anything on this site — every page is server-rendered and readable without it. If you'd like anything associated with you removed, or you have a question about the above, email ${siteConfig.email} and I'll handle it personally.`,
        },
      ],
    },
  ],
};

export const developersContent: PageContent = {
  path: "/developers",
  title: "Developers",
  heading: "Developer and agent resources for kyh.io",
  description:
    "Machine-readable endpoints for kyh.io: llms.txt, markdown content negotiation, sitemap, robots, and the npx kyh CLI.",
  intro: [
    "kyh.io is built to be read by software as well as by people. Every page is server-rendered, the homepage is available as markdown through content negotiation, and there's an llms.txt index describing what lives where. This page is the human-readable map of those endpoints.",
    "There is no public HTTP API, no authentication, no webhooks and no MCP server behind this domain — if you find something claiming otherwise, it isn't mine. What follows is the complete list.",
  ],
  sections: [
    {
      id: "machine-readable",
      heading: "Machine-readable endpoints",
      blocks: [
        { kind: "links", items: agentRoutes.map(toContentLink) },
        {
          kind: "subheading",
          text: "Content negotiation",
        },
        {
          kind: "text",
          text: "Send `Accept: text/markdown` to https://www.kyh.io/ and you'll get the markdown representation of the homepage instead of HTML; send anything else and you'll get HTML. Both representations send `Vary: Accept` so a shared cache can't hand you the wrong one. The HTML response also advertises the alternate through an RFC 8288 `Link` header pointing at /markdown. Requests for paths that don't exist return a real HTTP 404 with a short markdown body listing where to look instead.",
        },
      ],
    },
    {
      id: "cli",
      heading: "The kyh CLI",
      blocks: [
        {
          kind: "text",
          text: "`npx kyh` runs this site in your terminal. It's a published npm package (`kyh`) built with Bun and OpenTUI that renders the same bio, work history and project list you see here, without a browser. No install, no configuration, no network calls beyond fetching the package.",
        },
        {
          kind: "links",
          items: [
            {
              label: "kyh on npm",
              href: "https://www.npmjs.com/package/kyh",
              description: "The CLI package. Run it with `npx kyh`.",
            },
            {
              label: "kyh/kyh.io on GitHub",
              href: "https://github.com/kyh/kyh.io",
              description: "The monorepo behind this site and the CLI, including AGENTS.md.",
            },
            {
              label: "@kyh/skills on npm",
              href: "https://www.npmjs.com/package/@kyh/skills",
              description: "Agent skills I use day to day, installable globally.",
            },
          ],
        },
      ],
    },
    {
      id: "reuse",
      heading: "Reuse and crawling",
      blocks: [
        {
          kind: "text",
          text: "robots.txt allows every user agent and declares Content-Signal preferences of `search=yes, ai-input=yes, ai-train=yes` — you may crawl this site, quote it, use it as model input, and train on it. Attribution back to https://www.kyh.io is appreciated but not required. Please read llms.txt before crawling broadly; it will save you most of the requests.",
        },
      ],
    },
    {
      id: "pages",
      heading: "Pages",
      blocks: [{ kind: "links", items: siteRoutes.map(toContentLink) }],
    },
  ],
};

export const prosePages: PageContent[] = [
  aboutContent,
  contactContent,
  privacyContent,
  developersContent,
];
