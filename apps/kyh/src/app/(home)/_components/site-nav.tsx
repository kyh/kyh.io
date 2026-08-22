import NextLink from "next/link";

import { ProseText } from "@/components/prose-text";
import { agentRoutes, siteRoutes } from "@/lib/config";

const otherPages = siteRoutes.filter((route) => route.path !== "/");

/**
 * Footer-weight links to the rest of the site and to its machine-readable views.
 * Crawlers and agents only find `/about`, `/contact`, `/privacy`, `/developers`
 * and `llms.txt` if something links to them; the homepage is that something.
 */
export const SiteNav = () => (
  <div className="-mx-2 flex flex-col">
    {otherPages.map((route) => (
      <NextLink key={route.path} href={route.path} className="list-row list-row-plain">
        <span className="text-foreground-highlighted">{route.title}</span>
        <span>
          <ProseText text={route.description} />
        </span>
      </NextLink>
    ))}
    {agentRoutes.map((route) => (
      <a key={route.path} href={route.path} className="list-row list-row-plain">
        <span className="text-foreground-highlighted">{route.title}</span>
        <span>
          <ProseText text={route.description} />
        </span>
      </a>
    ))}
  </div>
);
