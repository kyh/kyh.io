"use client";

import { theme } from "../app/styles/tokens.stylex";

import {
  colors,
  fontSizeLineHeights,
  fontSizes,
  spacing,
} from "@repo/tailwind-compat/tokens.stylex";

import * as stylex from "@stylexjs/stylex";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Pin } from "lucide-react";

import type { VideoPlatform } from "@/db/drizzle-schema";
import { formatDate } from "@/lib/format";
import { VideoCarousel } from "./video-carousel";

const styles = stylex.create({
  pin: { height: spacing[4], width: spacing[4], fill: colors.yellow500, color: colors.yellow500 },
  meta: {
    marginTop: spacing[3],
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: fontSizes.sm,
    lineHeight: fontSizeLineHeights.sm,
  },
  voteGroup: { display: "flex", alignItems: "center", gap: spacing[4] },
  actionGroup: { display: "flex", alignItems: "center", gap: spacing[3] },
  vote: { cursor: "pointer" },
  voteOn: { color: theme.foreground },
  voteOff: {
    color: {
      default: theme.mutedForeground,
      "@media (hover: hover)": { default: theme.mutedForeground, ":hover": theme.foreground },
    },
  },
  sourceLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: spacing[1],
    color: {
      default: theme.mutedForeground,
      "@media (hover: hover)": { default: theme.mutedForeground, ":hover": theme.foreground },
    },
  },
  extIcon: { height: spacing[3], width: spacing[3] },
  reportOff: {
    color: {
      default: theme.mutedForeground,
      "@media (hover: hover)": { default: theme.mutedForeground, ":hover": theme.destructive },
    },
  },
  reportOn: { color: "color-mix(in oklab, var(--muted-foreground) 40%, transparent)" },
});

type Video = {
  id: number;
  url: string;
  platform: VideoPlatform;
};

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
};

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
            {pinned && <Pin {...stylex.props(styles.pin)} aria-label="Pinned" />}
            {headerRight}
          </>
        }
      />

      <div {...stylex.props(styles.meta)}>
        <div {...stylex.props(styles.voteGroup)} role="group" aria-label="Vote on this incident">
          <button
            type="button"
            onClick={() => onVote("unjustified")}
            {...stylex.props(
              styles.vote,
              userVote === "unjustified" ? styles.voteOn : styles.voteOff,
            )}
            aria-pressed={userVote === "unjustified"}
            aria-label={`Vote unjustified, ${unjustifiedCount} votes`}
          >
            unjustified ({unjustifiedCount})
          </button>
          <button
            type="button"
            onClick={() => onVote("justified")}
            {...stylex.props(
              styles.vote,
              userVote === "justified" ? styles.voteOn : styles.voteOff,
            )}
            aria-pressed={userVote === "justified"}
            aria-label={`Vote justified, ${justifiedCount} votes`}
          >
            justified ({justifiedCount})
          </button>
        </div>
        <div {...stylex.props(styles.actionGroup)}>
          <a
            href={currentVideo.url}
            target="_blank"
            rel="noopener noreferrer"
            {...stylex.props(styles.sourceLink)}
            aria-label={`Open video on ${currentVideo.platform === "twitter" ? "X" : currentVideo.platform} (opens in new tab)`}
          >
            open on {currentVideo.platform === "twitter" ? "x" : currentVideo.platform}
            <ExternalLink {...stylex.props(styles.extIcon)} aria-hidden="true" />
          </a>
          {onReport && (
            <button
              type="button"
              onClick={onReport}
              disabled={reported}
              {...stylex.props(styles.vote, reported ? styles.reportOn : styles.reportOff)}
              aria-label={reported ? "This incident has been reported" : "Report this incident"}
            >
              {reported ? "reported" : "report"}
            </button>
          )}
        </div>
      </div>
    </>
  );
};
