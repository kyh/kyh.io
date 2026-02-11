import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AI_AGENT_PATTERNS = [
  "GPTBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "Amazonbot",
  "Bytespider",
  "CCBot",
  "Google-Extended",
  "PerplexityBot",
  "Cohere-ai",
  "Meta-ExternalAgent",
  "FacebookBot",
  "Applebot-Extended",
  "YouBot",
  "Diffbot",
  "ImagesiftBot",
  "Omgilibot",
];

const isAIAgent = (userAgent: string): boolean => {
  return AI_AGENT_PATTERNS.some((pattern) =>
    userAgent.toLowerCase().includes(pattern.toLowerCase()),
  );
};

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") ?? "";

  if (isAIAgent(userAgent)) {
    const markdownUrl = new URL("/markdown", request.url);
    return NextResponse.rewrite(markdownUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - /markdown (avoid redirect loop)
     * - /api routes
     * - /_next (Next.js internals)
     * - Static files (images, fonts, etc.)
     */
    "/((?!markdown|api|_next|favicon\\.ico|assets|sitemap\\.xml|robots\\.txt).*)",
  ],
};
