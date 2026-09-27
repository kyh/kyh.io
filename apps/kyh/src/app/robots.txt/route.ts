import { absoluteUrl } from "@/lib/config";

// Custom robots.txt route (instead of the metadata `robots.ts`) so we can emit
// Content-Signal directives declaring AI usage preferences.
// https://contentsignals.org/
export const GET = () => {
  const body = `User-agent: *
Content-Signal: search=yes, ai-input=yes, ai-train=yes
Allow: /

Sitemap: ${absoluteUrl("/sitemap.xml")}

# Agent index: ${absoluteUrl("/llms.txt")}
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
