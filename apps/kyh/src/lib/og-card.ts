import { siteConfig, siteRoutes } from "@/lib/config";
import type { SiteRoute } from "@/lib/config";

/**
 * Share cards: one 1200x630 PNG per canonical route in `siteRoutes`, drawn by
 * `app/cards/[page]/route.tsx` from the route's own title and description, at
 * a stable URL the metadata and twitter tags point at. The homepage keeps its
 * designed `og.jpg`, so it has no card.
 */
export const CARD_SIZE = { height: 630, width: 1200 };

/** `/about` → `about`; the homepage has no card. */
export const cardSlug = (path: string) => path.replace(/^\//u, "").replaceAll("/", "-");

export const cardRoutes: SiteRoute[] = siteRoutes.filter((route) => route.path !== "/");

export const cardRouteFor = (slug: string) =>
  cardRoutes.find((route) => cardSlug(route.path) === slug) ?? null;

export const cardUrl = (path: string) => `${siteConfig.url}/cards/${cardSlug(path)}`;

export const cardAlt = (route: SiteRoute) =>
  `${route.title}, ${siteConfig.siteName}: ${route.description}`;

/** The og:image entry for a route's card, or null for one with none (the homepage). */
export const cardImage = (path: string) => {
  const route = cardRoutes.find((candidate) => candidate.path === path);
  return route ? { ...CARD_SIZE, alt: cardAlt(route), url: cardUrl(route.path) } : null;
};
