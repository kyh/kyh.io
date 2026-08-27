"use client";

import { theme } from "../app/styles/tokens.stylex";

import {
  animations,
  fontSizeLineHeights,
  fontSizes,
  spacing,
} from "@repo/tailwind-compat/tokens.stylex";

import * as stylex from "@stylexjs/stylex";

import type { ReactNode } from "react";
import { Component, lazy, Suspense } from "react";

import type { VideoPlatform } from "@/db/drizzle-schema";
import { useTheme } from "@/components/theme";
import { useIsHydrated } from "@/lib/use-hydrated";
import { extractInstagramType, extractVideoId } from "@/lib/video-utils";

const styles = stylex.create({
  fallbackLink: {
    display: "block",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: {
      default: theme.border,
      "@media (hover: hover)": { default: theme.border, ":hover": theme.mutedForeground },
    },
    padding: spacing[4],
    fontSize: fontSizes.sm,
    lineHeight: fontSizeLineHeights.sm,
    color: {
      default: theme.mutedForeground,
      "@media (hover: hover)": { default: theme.mutedForeground, ":hover": theme.foreground },
    },
  },
  skeleton: { height: "200px", animation: animations.pulse, backgroundColor: theme.muted },
  errorBox: {
    pointerEvents: "auto",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: theme.border,
    padding: spacing[4],
    fontSize: fontSizes.sm,
    lineHeight: fontSizeLineHeights.sm,
    color: theme.mutedForeground,
  },
  errorLink: {
    marginTop: spacing[2],
    display: "inline-block",
    color: {
      default: theme.foreground,
      "@media (hover: hover)": { default: theme.foreground, ":hover": theme.mutedForeground },
    },
    textDecorationLine: "underline",
  },
  frame: { width: "100%", maxWidth: "550px" },
});

type VideoEmbedProps = {
  url: string;
  platform: VideoPlatform;
};

const platformNames = {
  twitter: "x",
  youtube: "youtube",
  tiktok: "tiktok",
  facebook: "facebook",
  instagram: "instagram",
  linkedin: "linkedin",
  pinterest: "pinterest",
  reddit: "reddit",
} satisfies Record<VideoPlatform, string>;

const FallbackLink = ({ url, platform }: { url: string; platform: VideoPlatform }) => {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" {...stylex.props(styles.fallbackLink)}>
      open on {platformNames[platform]}
    </a>
  );
};

type EmbedErrorBoundaryProps = { fallback: ReactNode; children: ReactNode };

// Third-party embeds (react-tweet especially) can throw at render time when a
// platform changes its API response shape. Contain the blast radius to the
// embed instead of unmounting the whole page.
class EmbedErrorBoundary extends Component<EmbedErrorBoundaryProps, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

const YouTubeEmbed = ({ videoId }: { videoId: string }) => {
  return (
    <iframe
      src={`https://www.youtube.com/embed/${videoId}`}
      width="100%"
      height="315"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      style={{ border: "none" }}
      title="YouTube video"
    />
  );
};

const LazyTweet = lazy(() => import("react-tweet").then((mod) => ({ default: mod.Tweet })));

const TwitterEmbed = ({ tweetId, url }: { tweetId: string; url: string }) => {
  const isHydrated = useIsHydrated();
  const { resolvedTheme } = useTheme();

  if (!isHydrated) {
    return <div {...stylex.props(styles.skeleton)} />;
  }

  const TweetNotFound = () => (
    <div {...stylex.props(styles.errorBox)}>
      <p>Tweet not found. X may have blocked embedding this video.</p>
      <a href={url} target="_blank" rel="noopener noreferrer" {...stylex.props(styles.errorLink)}>
        Open on X to view
      </a>
    </div>
  );

  return (
    <div className="tweet-embed" data-theme={resolvedTheme ?? "light"}>
      <Suspense fallback={<div {...stylex.props(styles.skeleton)} />}>
        <LazyTweet id={tweetId} components={{ TweetNotFound }} />
      </Suspense>
    </div>
  );
};

const TikTokEmbed = ({ videoId }: { videoId: string }) => {
  return (
    <iframe
      src={`https://www.tiktok.com/embed/v2/${videoId}`}
      width="100%"
      height="740"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      style={{ border: "none" }}
      title="TikTok video"
    />
  );
};

const FacebookEmbed = ({ url }: { url: string }) => {
  return (
    <iframe
      src={`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`}
      width="100%"
      height="315"
      allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
      allowFullScreen
      style={{ border: "none" }}
      title="Facebook video"
    />
  );
};

const InstagramEmbed = ({ postId, type }: { postId: string; type: "p" | "reel" | "tv" }) => {
  return (
    <iframe
      src={`https://www.instagram.com/${type}/${postId}/embed`}
      width="100%"
      height="500"
      style={{ border: "none" }}
      allowFullScreen
      title="Instagram post"
    />
  );
};

const RedditEmbed = ({ url }: { url: string }) => {
  const cleanUrl = url.split("?")[0].replace(/\/$/, "");
  const embedUrl =
    cleanUrl.replace("www.reddit.com", "www.redditmedia.com") +
    "/?ref_source=embed&ref=share&embed=true&showmedia=true&showedits=false";

  return (
    <iframe
      src={embedUrl}
      sandbox="allow-scripts allow-same-origin allow-popups"
      style={{ border: "none" }}
      height="500"
      width="100%"
      scrolling="no"
      title="Reddit post"
    />
  );
};

export const VideoEmbed = ({ url, platform }: VideoEmbedProps) => {
  const videoId = extractVideoId(url, platform);

  if (!videoId) {
    return <FallbackLink url={url} platform={platform} />;
  }

  const renderEmbed = () => {
    switch (platform) {
      case "youtube":
        return <YouTubeEmbed videoId={videoId} />;
      case "twitter":
        return <TwitterEmbed tweetId={videoId} url={url} />;
      case "tiktok":
        return <TikTokEmbed videoId={videoId} />;
      case "facebook":
        return <FacebookEmbed url={url} />;
      case "instagram": {
        const type = extractInstagramType(url);
        return <InstagramEmbed postId={videoId} type={type} />;
      }
      case "reddit":
        return <RedditEmbed url={url} />;
      case "linkedin":
      case "pinterest":
        return <FallbackLink url={url} platform={platform} />;
    }
  };

  return (
    <div {...stylex.props(styles.frame)}>
      <EmbedErrorBoundary fallback={<FallbackLink url={url} platform={platform} />}>
        {renderEmbed()}
      </EmbedErrorBoundary>
    </div>
  );
};
