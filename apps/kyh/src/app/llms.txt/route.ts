import { buildLlmsTxt } from "@/lib/llms-txt";

export const GET = () =>
  new Response(buildLlmsTxt(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
