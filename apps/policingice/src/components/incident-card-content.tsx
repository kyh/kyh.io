"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Pin } from "lucide-react";

import type { VideoPlatform } from "@/db/drizzle-schema";
import { VideoCarousel } from "./video-carousel";

type Video = {
  id: number;
  url: string;
  platform: VideoPlatform;
}

type IncidentCardContentProps = {
  incidentId: number;
  location: string | null;
  incidentDate: Date | null;
  createdAt: Date | null;
  videos: Video[];
  unjustifiedCount: number;
  justifiedCount: number;
  userVote: "unjustified" | "justified" | null;
  onVote: (type: "unjustified" | "justified") => void;
  onReport?: () => void;
  reported?: boolean;
  pinned?: boolean;
  headerRight?: React.ReactNode;
}

function formatDate(date: Date | null) {
  if (!date) return null;
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export const IncidentCardContent = ({
  incidentId,
  location,
  incidentDate,
  createdAt,
  videos,
  unjustifiedCount,
  justifiedCount,
  userVote,
  onVote,
  onReport,
  reported,
  pinned,
  headerRight,
}: IncidentCardContentProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const displayDate = incidentDate ?? createdAt;
  const currentVideo = videos[currentSlide] ?? videos[0];

  return (
    <>
      <VideoCarousel
        videos={videos}
        incidentId={incidentId}
        onSlideChange={setCurrentSlide}
        header={
          <Link href={`/incident/${incidentId}`}>
            {location && <>{location}</>}
            {location && displayDate && <> · </>}
            {displayDate && formatDate(displayDate)}
          </Link>
        }
        headerRight={
          <>
            {pinned && (
              <Pin
                className="h-4 w-4 fill-yellow-500 text-yellow-500"
                aria-label="Pinned"
              />
            )}
            {headerRight}
          </>
        }
      />

      <div className="mt-3 flex items-center justify-between text-sm">
        <div
          className="flex items-center gap-4"
          role="group"
          aria-label="Vote on this incident"
        >
          <button
            onClick={() => onVote("unjustified")}
            className={`cursor-pointer ${userVote === "unjustified" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            aria-pressed={userVote === "unjustified"}
            aria-label={`Vote unjustified, ${unjustifiedCount} votes`}
          >
            unjustified ({unjustifiedCount})
          </button>
          <button
            onClick={() => onVote("justified")}
            className={`cursor-pointer ${userVote === "justified" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            aria-pressed={userVote === "justified"}
            aria-label={`Vote justified, ${justifiedCount} votes`}
          >
            justified ({justifiedCount})
          </button>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={currentVideo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
            aria-label={`Open video on ${currentVideo.platform === "twitter" ? "X" : currentVideo.platform} (opens in new tab)`}
          >
            open on{" "}
            {currentVideo.platform === "twitter"
              ? "x"
              : currentVideo.platform}
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
          {onReport && (
            <button
              onClick={onReport}
              disabled={reported}
              className={`cursor-pointer ${reported ? "text-muted-foreground/40" : "text-muted-foreground hover:text-destructive"}`}
              aria-label={
                reported
                  ? "This incident has been reported"
                  : "Report this incident"
              }
            >
              {reported ? "reported" : "report"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
