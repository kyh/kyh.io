"use client";

import type { ReactNode } from "react";
import { Component, lazy, Suspense, useMemo } from "react";

import type { VideoPlatform } from "@/db/drizzle-schema";
import { useTheme } from "@/components/theme";
import { useIsHydrated } from "@/lib/use-hydrated";
import { extractInstagramType, extractVideoId } from "@/lib/video-utils";

interface VideoEmbedProps {
  url: string;
  platform: VideoPlatform;
}

const platformNames = {
  facebook: "facebook",
  instagram: "instagram",
  linkedin: "linkedin",
  pinterest: "pinterest",
  reddit: "reddit",
  tiktok: "tiktok",
  twitter: "x",
  youtube: "youtube",
} satisfies Record<VideoPlatform, string>;

const FallbackLink = ({ url, platform }: { url: string; platform: VideoPlatform }) => (
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    className="block border border-border p-4 text-sm text-muted-foreground hover:border-muted-foreground hover:text-foreground"
  >
    open on {platformNames[platform]}
  </a>
);

interface EmbedErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

// Third-party embeds (react-tweet especially) can throw at render time when a
// platform changes its API response shape. Contain the blast radius to the
// embed instead of unmounting the whole page.
class EmbedErrorBoundary extends Component<EmbedErrorBoundaryProps, { hasError: boolean }> {
  constructor(props: EmbedErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

const YouTubeEmbed = ({ videoId }: { videoId: string }) => (
  // oxlint-disable-next-line react/iframe-missing-sandbox -- third-party player needs scripts and same-origin, which is the combination the rule forbids
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

const LazyTweet = lazy(async () => {
  const mod = await import("react-tweet");
  return { default: mod.Tweet };
});

const TweetNotFoundLink = ({ url }: { url: string }) => (
  <div className="pointer-events-auto border border-border p-4 text-sm text-muted-foreground">
    <p>Tweet not found. X may have blocked embedding this video.</p>
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 inline-block text-foreground underline hover:text-muted-foreground"
    >
      Open on X to view
    </a>
  </div>
);

// react-tweet's TweetNotFound slot takes no url prop, so it gets bound here
const makeTweetComponents = (url: string) => {
  const TweetNotFound = () => <TweetNotFoundLink url={url} />;
  return { TweetNotFound };
};

const TwitterEmbed = ({ tweetId, url }: { tweetId: string; url: string }) => {
  const isHydrated = useIsHydrated();
  const { resolvedTheme } = useTheme();
  const components = useMemo(() => makeTweetComponents(url), [url]);

  if (!isHydrated) {
    return <div className="h-[200px] animate-pulse bg-muted" />;
  }

  return (
    <div className="[&_.react-tweet-theme]:!m-0" data-theme={resolvedTheme ?? "light"}>
      <Suspense fallback={<div className="h-[200px] animate-pulse bg-muted" />}>
        <LazyTweet id={tweetId} components={components} />
      </Suspense>
    </div>
  );
};

const TikTokEmbed = ({ videoId }: { videoId: string }) => (
  // oxlint-disable-next-line react/iframe-missing-sandbox -- third-party player needs scripts and same-origin, which is the combination the rule forbids
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

const FacebookEmbed = ({ url }: { url: string }) => (
  // oxlint-disable-next-line react/iframe-missing-sandbox -- third-party player needs scripts and same-origin, which is the combination the rule forbids
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

const InstagramEmbed = ({ postId, type }: { postId: string; type: "p" | "reel" | "tv" }) => (
  // oxlint-disable-next-line react/iframe-missing-sandbox -- third-party player needs scripts and same-origin, which is the combination the rule forbids
  <iframe
    src={`https://www.instagram.com/${type}/${postId}/embed`}
    width="100%"
    height="500"
    style={{ border: "none" }}
    allowFullScreen
    title="Instagram post"
  />
);

const RedditEmbed = ({ url }: { url: string }) => {
  const cleanUrl = url.split("?")[0].replace(/\/$/u, "");
  const embedUrl = `${cleanUrl.replace(
    "www.reddit.com",
    "www.redditmedia.com",
  )}/?ref_source=embed&ref=share&embed=true&showmedia=true&showedits=false`;

  /* oxlint-disable react/iframe-missing-sandbox -- third-party player needs scripts and same-origin, which is the combination the rule forbids */
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
  /* oxlint-enable react/iframe-missing-sandbox */
};

export const VideoEmbed = ({ url, platform }: VideoEmbedProps) => {
  const videoId = extractVideoId(url, platform);

  if (!videoId) {
    return <FallbackLink url={url} platform={platform} />;
  }

  const renderEmbed = () => {
    switch (platform) {
      case "youtube": {
        return <YouTubeEmbed videoId={videoId} />;
      }
      case "twitter": {
        return <TwitterEmbed tweetId={videoId} url={url} />;
      }
      case "tiktok": {
        return <TikTokEmbed videoId={videoId} />;
      }
      case "facebook": {
        return <FacebookEmbed url={url} />;
      }
      case "instagram": {
        const type = extractInstagramType(url);
        return <InstagramEmbed postId={videoId} type={type} />;
      }
      case "reddit": {
        return <RedditEmbed url={url} />;
      }
      case "linkedin":
      case "pinterest": {
        return <FallbackLink url={url} platform={platform} />;
      }
      default: {
        return <FallbackLink url={url} platform={platform} />;
      }
    }
  };

  return (
    <div className="w-full max-w-[550px]">
      <EmbedErrorBoundary fallback={<FallbackLink url={url} platform={platform} />}>
        {renderEmbed()}
      </EmbedErrorBoundary>
    </div>
  );
};
