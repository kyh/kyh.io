import { buildHomeMarkdown } from "@/lib/markdown";

export const GET = () =>
  new Response(buildHomeMarkdown(), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      // This body is also served from `/` via `Accept` negotiation, so shared
      // caches have to key on Accept or they will hand HTML to an agent.
      Vary: "Accept",
    },
  });
