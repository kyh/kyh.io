import NextLink from "next/link";

import { ProseText } from "@/components/prose-text";
import { agentRoutes, siteRoutes } from "@/lib/config";

const otherPages = siteRoutes.filter((route) => route.path !== "/");

/**
 * Links to the rest of the site and to its machine-readable views. Crawlers and
 * agents only find `/about`, `/contact`, `/privacy`, `/agents` and `llms.txt` if
 * something links to them; the homepage is that something. The homepage renders
 * this visually hidden, so the links stay out of the tab order and skip prefetch.
 */
export const SiteNav = () => (
  <div className="-mx-2 flex flex-col">
    {otherPages.map((route) => (
      <NextLink
        key={route.path}
        href={route.path}
        prefetch={false}
        tabIndex={-1}
        className="list-row list-row-plain"
      >
        <span className="text-foreground-highlighted">{route.title}</span>
        <span>
          <ProseText text={route.description} />
        </span>
      </NextLink>
    ))}
    {agentRoutes.map((route) => (
      <a key={route.path} href={route.path} tabIndex={-1} className="list-row list-row-plain">
        <span className="text-foreground-highlighted">{route.title}</span>
        <span>
          <ProseText text={route.description} />
        </span>
      </a>
    ))}
  </div>
);
