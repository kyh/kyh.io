import { buildHomeMarkdown } from "@/lib/markdown";

// Pure content, no request input: prerender it so the CDN can cache it.
export const dynamic = "force-static";

export const GET = () =>
  new Response(buildHomeMarkdown(), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      // This body is also served from `/` via `Accept` negotiation, so shared
      // caches have to key on Accept or they will hand HTML to an agent.
      Vary: "Accept",
    },
  });
