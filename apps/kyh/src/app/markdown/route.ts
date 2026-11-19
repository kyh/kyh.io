import { buildHomeMarkdown } from "@/lib/markdown";

export const GET = () =>
  new Response(buildHomeMarkdown(), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      Vary: "Accept",
    },
  });
