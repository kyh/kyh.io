"use client";

import { useEffect, useState } from "react";

import type { VideoPlatform } from "@/db/schema";
import { extractVideoId } from "@/lib/video-utils";

interface VideoEmbedProps {
  url: string;
  platform: VideoPlatform;
}

const platformNames: Record<VideoPlatform, string> = {
  twitter: "x",
  youtube: "youtube",
  tiktok: "tiktok",
  facebook: "facebook",
  instagram: "instagram",
  linkedin: "linkedin",
  pinterest: "pinterest",
  reddit: "reddit",
};

interface EmbedComponentProps {
  url: string;
  width?: string | number;
  height?: string | number;
  placeholderDisabled?: boolean;
}

function FallbackLink({
  url,
  platform,
}: {
  url: string;
  platform: VideoPlatform;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block border border-neutral-200 p-4 text-sm text-neutral-500 hover:border-neutral-400 hover:text-neutral-900"
    >
      open on {platformNames[platform]}
    </a>
  );
}

function RedditEmbed({ url }: { url: string }) {
  // Convert Reddit URL to embed URL
  // e.g., https://www.reddit.com/r/sub/comments/id/title/
  // becomes https://www.redditmedia.com/r/sub/comments/id/title/?ref_source=embed&embed=true
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
}

export function VideoEmbed({ url, platform }: VideoEmbedProps) {
  const [Embed, setEmbed] =
    useState<React.ComponentType<EmbedComponentProps> | null>(null);
  const videoId = extractVideoId(url, platform);

  useEffect(() => {
    if (!videoId || platform === "reddit") return;

    import("react-social-media-embed").then((mod) => {
      const embedMap: Partial<
        Record<VideoPlatform, React.ComponentType<EmbedComponentProps>>
      > = {
        youtube: mod.YouTubeEmbed,
        twitter: mod.XEmbed,
        tiktok: mod.TikTokEmbed,
        facebook: mod.FacebookEmbed,
        instagram: mod.InstagramEmbed,
        linkedin: mod.LinkedInEmbed,
        pinterest: mod.PinterestEmbed,
      };
      const component = embedMap[platform];
      if (component) setEmbed(() => component);
    });
  }, [videoId, platform]);

  // Reddit uses custom embed
  if (platform === "reddit") {
    return (
      <div className="w-full max-w-[550px]">
        <RedditEmbed url={url} />
      </div>
    );
  }

  if (!videoId) {
    return <FallbackLink url={url} platform={platform} />;
  }

  return (
    <div className="w-full max-w-[550px]">
      {Embed && <Embed url={url} width="100%" />}
    </div>
  );
}
