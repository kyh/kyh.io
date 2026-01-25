import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { ArrowLeft, Check, X } from "lucide-react";
import { z } from "zod";

import { db } from "@/db/index";
import { incidents, videos } from "@/db/schema";
import { detectPlatform, isValidVideoUrl } from "@/lib/video-utils";

// Extract URLs from shared text content
function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  const matches = text.match(urlRegex) || [];
  // Clean up URLs (remove trailing punctuation)
  return matches.map((url) => url.replace(/[.,;:!?)]+$/, ""));
}

// Find the first valid video URL from shared content
function findVideoUrl(
  url?: string,
  text?: string,
  title?: string,
): string | null {
  // Check direct URL first
  if (url && isValidVideoUrl(url)) {
    return url;
  }

  // Extract URLs from text
  if (text) {
    const urls = extractUrls(text);
    for (const u of urls) {
      if (isValidVideoUrl(u)) {
        return u;
      }
    }
  }

  // Extract URLs from title (some apps put URL in title)
  if (title) {
    const urls = extractUrls(title);
    for (const u of urls) {
      if (isValidVideoUrl(u)) {
        return u;
      }
    }
  }

  return null;
}

const createIncidentFromShare = createServerFn({ method: "POST" })
  .inputValidator((data: { videoUrl: string }) => data)
  .handler(async ({ data }) => {
    // Check if URL already exists
    const existingVideo = await db.query.videos.findFirst({
      where: (videos, { eq }) => eq(videos.url, data.videoUrl),
      with: { incident: true },
    });

    if (existingVideo) {
      return {
        success: true,
        incident: existingVideo.incident,
        alreadyExists: true,
      };
    }

    // Create new incident
    const platform = detectPlatform(data.videoUrl);
    const [incident] = await db
      .insert(incidents)
      .values({
        status: "approved",
        incidentDate: new Date(),
      })
      .returning();

    await db.insert(videos).values({
      incidentId: incident.id,
      url: data.videoUrl,
      platform,
    });

    return {
      success: true,
      incident,
      alreadyExists: false,
    };
  });

const shareParamsSchema = z.object({
  url: z.string().optional(),
  text: z.string().optional(),
  title: z.string().optional(),
});

export const Route = createFileRoute("/share")({
  component: SharePage,
  validateSearch: shareParamsSchema,
});

function SharePage() {
  const navigate = useNavigate();
  const { url, text, title } = Route.useSearch();

  const [status, setStatus] = useState<
    "processing" | "success" | "error" | "invalid"
  >("processing");
  const [message, setMessage] = useState("");
  const [incidentId, setIncidentId] = useState<number | null>(null);

  useEffect(() => {
    const processShare = async () => {
      const videoUrl = findVideoUrl(url, text, title);

      if (!videoUrl) {
        setStatus("invalid");
        setMessage(
          "No supported video URL found. Supported platforms: Twitter, YouTube, TikTok, Facebook, Instagram, LinkedIn, Pinterest, Reddit.",
        );
        return;
      }

      try {
        const result = await createIncidentFromShare({ data: { videoUrl } });

        if (result.success) {
          setStatus("success");
          setIncidentId(result.incident.id);
          setMessage(
            result.alreadyExists
              ? "This video was already submitted."
              : "Incident created successfully!",
          );

          // Auto-redirect after 2 seconds
          setTimeout(() => {
            navigate({ to: "/" });
          }, 2000);
        } else {
          setStatus("error");
          setMessage("Failed to create incident. Please try again.");
        }
      } catch (err) {
        setStatus("error");
        setMessage(
          err instanceof Error ? err.message : "An unexpected error occurred.",
        );
      }
    };

    processShare();
  }, [url, text, title, navigate]);

  return (
    <main className="min-h-screen bg-white px-4 py-8 sm:px-6">
      <div className="max-w-xl">
        <nav className="mb-12">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </nav>

        <div className="flex flex-col items-center justify-center py-12">
          {status === "processing" && (
            <>
              <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900" />
              <p className="text-sm text-neutral-500">Processing shared link...</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <p className="mb-2 text-center text-sm text-neutral-900">
                {message}
              </p>
              {incidentId && (
                <Link
                  to="/incident/$id"
                  params={{ id: String(incidentId) }}
                  className="text-sm text-neutral-500 underline underline-offset-2 hover:text-neutral-900"
                >
                  View incident
                </Link>
              )}
              <p className="mt-4 text-xs text-neutral-400">
                Redirecting to home...
              </p>
            </>
          )}

          {(status === "error" || status === "invalid") && (
            <>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <X className="h-6 w-6 text-red-600" />
              </div>
              <p className="mb-4 text-center text-sm text-neutral-900">
                {message}
              </p>
              <Link
                to="/"
                className="text-sm text-neutral-500 underline underline-offset-2 hover:text-neutral-900"
              >
                Go to home
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
