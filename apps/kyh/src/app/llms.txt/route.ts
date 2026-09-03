import { buildLlmsTxt } from "@/lib/llms-txt";

// Pure content, no request input: prerender it so the CDN can cache it.
export const dynamic = "force-static";

export const GET = () =>
  new Response(buildLlmsTxt(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
