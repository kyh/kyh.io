import type { SiteRoute } from "@/lib/config";
import { absoluteUrl, agentRoutes, siteConfig, siteRoutes } from "@/lib/config";

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Descriptions are authored as markdown-ish text; only code spans need markup. */
const renderDescription = (description: string) =>
  escapeHtml(description).replace(/`([^`]+)`/g, "<code>$1</code>");

const listItem = (route: SiteRoute) =>
  `<li><a href="${route.path}">${escapeHtml(route.title)}</a> <span>${renderDescription(route.description)}</span></li>`;

/**
 * Deliberately does not render inside the root layout: that ships the dock, the
 * multiplayer canvas and a ~45 KB RSC payload, none of which help someone who
 * landed on a URL that doesn't exist.
 */
export const buildNotFoundHtml = (pathname: string) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>404 — Not found | ${escapeHtml(siteConfig.name)}</title>
<meta name="robots" content="noindex, follow">
<meta name="description" content="No page exists at ${escapeHtml(pathname)} on ${escapeHtml(siteConfig.siteName)}. Links to every page on the site.">
<link rel="canonical" href="${absoluteUrl("/")}">
<link rel="alternate" type="text/markdown" href="${absoluteUrl("/markdown")}" title="Markdown version for agents">
<link rel="icon" href="/favicon/favicon.svg" type="image/svg+xml">
<style>
:root { color-scheme: light dark; --fg: #0f172a; --muted: #64748b; --bg: #f8fafc; --line: #e2e8f0; }
@media (prefers-color-scheme: dark) { :root { --fg: #f1f5f9; --muted: #94a3b8; --bg: #0b1120; --line: #1e293b; } }
body { margin: 0; background: var(--bg); color: var(--muted); font: 15px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
main { max-width: 560px; margin: 0 auto; padding: 15vh 24px 20vh; }
h1, h2 { color: var(--fg); font-weight: 500; line-height: 1.2; }
h1 { font-size: 1.125rem; margin: 0 0 .75rem; }
h2 { font-size: 1rem; margin: 2rem 0 .5rem; }
code { font-family: ui-monospace, SFMono-Regular, monospace; font-size: .9em; }
hr { border: 0; border-top: 1px solid var(--line); margin: 2rem 0; }
ul { list-style: none; margin: 0; padding: 0; }
li { display: flex; gap: 1rem; padding: 4px 0; }
li a { color: var(--fg); text-decoration: none; border-bottom: 1px solid var(--line); flex: 0 0 120px; }
li a:hover { border-color: currentColor; }
li span { flex: 1; }
</style>
</head>
<body>
<main>
<h1>404 — Not found</h1>
<p><code>${escapeHtml(pathname)}</code> is not a page on ${escapeHtml(siteConfig.siteName)}. Nothing was moved; this URL has never existed.</p>
<hr>
<h2>Where to look next</h2>
<ul>
${siteRoutes.map(listItem).join("\n")}
</ul>
<h2>Machine-readable</h2>
<ul>
${agentRoutes.map(listItem).join("\n")}
</ul>
</main>
</body>
</html>
`;
