import { SITE_URL } from "@/lib/site";

export const GET = () => {
  const body = `User-agent: *
Content-Signal: search=yes, ai-input=yes, ai-train=yes
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
