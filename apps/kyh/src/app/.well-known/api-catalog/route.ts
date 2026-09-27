import { buildApiCatalog } from "@/lib/openapi";

// Pure content, no request input: prerender it so the CDN can cache it.
export const dynamic = "force-static";

export const GET = () =>
  Response.json(buildApiCatalog(), {
    headers: {
      "Content-Type": 'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"',
    },
  });
