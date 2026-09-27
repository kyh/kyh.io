import { buildOpenApiDocument } from "@/lib/openapi";

// Pure content, no request input: prerender it so the CDN can cache it.
export const dynamic = "force-static";

export const GET = () => Response.json(buildOpenApiDocument());
