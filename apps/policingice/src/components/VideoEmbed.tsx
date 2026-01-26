"use client";

import { useEffect, useRef } from "react";

import type { VideoPlatform } from "@/db/schema";
import { extractInstagramType, extractVideoId } from "@/lib/video-utils";

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

function YouTubeEmbed({ videoId }: { videoId: string }) {
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
}

declare global {
  interface Window {
    twttr?: {
      widgets: {
        createTweet: (
          tweetId: string,
          container: HTMLElement,
          options?: { conversation?: string },
        ) => Promise<HTMLElement | undefined>;
      };
    };
  }
}

function TwitterEmbed({ tweetId }: { tweetId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const createdRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || createdRef.current) return;

    const createTweet = async () => {
      if (window.twttr?.widgets && container && !createdRef.current) {
        createdRef.current = true;
        await window.twttr.widgets.createTweet(tweetId, container, {
          conversation: "none",
        });
      }
    };

    if (!window.twttr) {
      const existingScript = document.querySelector(
        'script[src="https://platform.twitter.com/widgets.js"]',
      );
      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "https://platform.twitter.com/widgets.js";
        script.async = true;
        script.onload = () => void createTweet();
        document.body.appendChild(script);
      } else {
        existingScript.addEventListener("load", () => void createTweet());
      }
    } else {
      void createTweet();
    }
  }, [tweetId]);

  return (
    <div className="grid [&>*]:[grid-area:1/1]">
      <div className="flex h-[300px] items-center justify-center bg-neutral-50">
        <span className="text-sm text-neutral-400">Loading...</span>
      </div>
      <div ref={containerRef} className="bg-white empty:hidden" />
    </div>
  );
}

function TikTokEmbed({ videoId }: { videoId: string }) {
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
}

function FacebookEmbed({ url }: { url: string }) {
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
}

function InstagramEmbed({
  postId,
  type,
}: {
  postId: string;
  type: "p" | "reel" | "tv";
}) {
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
}

function RedditEmbed({ url }: { url: string }) {
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
  const videoId = extractVideoId(url, platform);

  if (!videoId) {
    return <FallbackLink url={url} platform={platform} />;
  }

  const renderEmbed = () => {
    switch (platform) {
      case "youtube":
        return <YouTubeEmbed videoId={videoId} />;
      case "twitter":
        return <TwitterEmbed tweetId={videoId} />;
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

  return <div className="w-full max-w-[550px]">{renderEmbed()}</div>;
}
