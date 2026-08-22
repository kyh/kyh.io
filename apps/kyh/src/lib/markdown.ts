import type { SiteRoute } from "@/lib/config";
import type { ContentLink, PageContent } from "@/lib/page-content";
import { absoluteUrl, agentRoutes, siteConfig, siteRoutes } from "@/lib/config";
import { connectLinks, projects, workHistory } from "@/lib/data";

/** Site-relative hrefs become absolute so the markdown stands on its own. */
const resolveHref = (href: string) => (href.startsWith("/") ? absoluteUrl(href) : href);

const linkLine = (link: ContentLink) =>
  `- [${link.label}](${resolveHref(link.href)}): ${link.description}`;

const routeLine = (route: SiteRoute) =>
  linkLine({ label: route.title, href: route.path, description: route.description });

/** Renders a `PageContent` to markdown. Mirrors what the React page renders. */
export const renderPageMarkdown = (page: PageContent) => {
  const parts: string[] = [`# ${page.heading}`, ...page.intro];

  for (const section of page.sections) {
    parts.push(`## ${section.heading}`);
    for (const block of section.blocks) {
      if (block.kind === "text") parts.push(block.text);
      if (block.kind === "subheading") parts.push(`### ${block.text}`);
      if (block.kind === "links") parts.push(block.items.map(linkLine).join("\n"));
    }
  }

  parts.push(`---\n\nCanonical URL: ${absoluteUrl(page.path)}`);

  return `${parts.join("\n\n")}\n`;
};

export const buildHomeMarkdown = () => `# Kaiyu Hsu

Hello world. You can call me Kai since we're pretty much friends now. I enjoy creating things for the internet. By day, I get to do that through investing, advising, and building products you may not have heard of, yet.

Welcome to my corner of the web.

## Highlights

- Oversaw product growth from dozens to millions of users
- Published research on [growth and retention](https://www.ahajournals.org/doi/10.1161/circ.136.suppl_1.21029)
- Led software development at various [large](https://amazon.com) [organizations](https://grow.google/)
- Helped build the frontend framework for the [worlds largest retailer](https://techcrunch.com/2020/09/01/amazons-big-redesign-on-ios-to-reach-all-u-s-users-by-month-end/)
- Contributing member of [USDR](https://github.com/orgs/usdigitalresponse) and the [OpenJS](https://github.com/orgs/nodejs) Foundation
- Took startups through [acquisitions](https://www.crunchbase.com/organization/cardiogram), [IPOs](https://retailtouchpoints.com/features/news-briefs/slyce-to-go-public-following-merger), and several [failures](https://techcrunch.com/2020/03/03/atrium-shuts-down/)

## Work

${workHistory.map((w) => `- **${w.company}** - ${w.role} (${w.year}) - [${w.link}](${w.link})`).join("\n")}

## Projects

${projects.map((p) => `- **${p.title}** - ${p.description} - [${p.url}](${p.url})`).join("\n")}

## Other Activities

Beyond work, I love to learn about economics, psychology, and business. You'll occasionally find me dabbling in the open source world, drawing things, building apps, and designing games. But honestly, I spend most of my days procrastinating.

## Connect

- Website: [kyh.io](https://kyh.io)
${connectLinks.map((l) => `- ${l.label}: [${l.value}](${l.href})`).join("\n")}
- Email: [${siteConfig.email}](mailto:${siteConfig.email})

## Pages

${siteRoutes.map(routeLine).join("\n")}

## For agents

${agentRoutes.map(routeLine).join("\n")}
`;

/**
 * The body served for a path that doesn't exist. Short on purpose: an agent that
 * took a wrong turn needs the recovery links, not the whole site.
 */
export const buildNotFoundMarkdown = (pathname: string) => `# 404 — Not found

\`${pathname}\` is not a page on ${siteConfig.siteName}. Nothing was moved; this URL has never existed.

## Where to look next

${siteRoutes.map(routeLine).join("\n")}

## Machine-readable

${agentRoutes.map(routeLine).join("\n")}
`;
