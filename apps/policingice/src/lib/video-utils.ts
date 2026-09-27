import type { VideoPlatform } from "@/db/drizzle-schema";

export const detectPlatform = (url: string): VideoPlatform => {
  const u = url.toLowerCase();
  if (u.includes("twitter.com") || u.includes("x.com")) {
    return "twitter";
  }
  if (u.includes("youtube.com") || u.includes("youtu.be")) {
    return "youtube";
  }
  if (u.includes("tiktok.com")) {
    return "tiktok";
  }
  if (u.includes("facebook.com") || u.includes("fb.watch")) {
    return "facebook";
  }
  if (u.includes("instagram.com")) {
    return "instagram";
  }
  if (u.includes("linkedin.com")) {
    return "linkedin";
  }
  if (u.includes("pinterest.com") || u.includes("pin.it")) {
    return "pinterest";
  }
  if (u.includes("reddit.com") || u.includes("redd.it")) {
    return "reddit";
  }
  throw new Error(
    "Unsupported platform. Use Twitter, YouTube, TikTok, Facebook, Instagram, LinkedIn, Pinterest, or Reddit links.",
  );
};

export const isValidVideoUrl = (url: string): boolean => {
  try {
    detectPlatform(url);
    return true;
  } catch {
    return false;
  }
};

const FETCH_TIMEOUT_MS = 5000;
const ALLOWED_TWITTER_HOSTS = new Set(["twitter.com", "x.com"]);

// Validate URL is from allowed Twitter/X domains (SSRF protection)
const isAllowedTwitterHost = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ALLOWED_TWITTER_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
};

// Fetch with timeout
const fetchWithTimeout = async (url: string, options: RequestInit): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

// Resolve Twitter/X URLs that use /i/status/ format to the actual URL with username
export const resolveVideoUrl = async (url: string): Promise<string> => {
  // Check if it's a Twitter/X URL with /i/status/ pattern
  if (!/^https?:\/\/(?:twitter\.com|x\.com)\/i\/status\/\d+/u.test(url)) {
    return url;
  }

  // SSRF protection: only allow requests to twitter.com/x.com
  if (!isAllowedTwitterHost(url)) {
    return url;
  }

  try {
    // Fetch with redirect: manual to get the Location header
    const response = await fetchWithTimeout(url, {
      method: "HEAD",
      redirect: "manual",
    });

    const location = response.headers.get("location");
    // Validate redirect is also to allowed host
    if (location && isAllowedTwitterHost(location) && isValidVideoUrl(location)) {
      return location;
    }

    // If no redirect, try following with GET
    const getResponse = await fetchWithTimeout(url, {
      redirect: "follow",
    });

    // Validate final URL is to allowed host
    if (
      getResponse.url &&
      isAllowedTwitterHost(getResponse.url) &&
      isValidVideoUrl(getResponse.url)
    ) {
      return getResponse.url;
    }
  } catch (error) {
    console.error("Failed to resolve Twitter URL:", url, error);
  }

  return url;
};

// Extract Instagram post type from URL
export const extractInstagramType = (url: string): "p" | "reel" | "tv" => {
  if (url.includes("/reel/")) {
    return "reel";
  }
  if (url.includes("/tv/")) {
    return "tv";
  }
  return "p";
};

const hostMarkerId = (url: string, markers: string[], id: string): string | null =>
  markers.some((marker) => url.includes(marker)) ? id : null;

const extractors: Record<VideoPlatform, (url: string) => string | null> = {
  // Facebook URLs vary widely, just check it's a valid FB URL
  facebook: (url) => hostMarkerId(url, ["facebook.com", "fb.watch"], "facebook"),
  instagram: (url) => /instagram\.com\/(?:p|reel|tv)\/(?<id>[^/?]+)/u.exec(url)?.groups?.id ?? null,
  linkedin: (url) => hostMarkerId(url, ["linkedin.com"], "linkedin"),
  pinterest: (url) => hostMarkerId(url, ["pinterest.com", "pin.it"], "pinterest"),
  reddit: (url) => hostMarkerId(url, ["reddit.com", "redd.it"], "reddit"),
  tiktok: (url) =>
    /tiktok\.com\/@[\w.]+\/video\/(?<id>\d+)/u.exec(url)?.groups?.id ??
    /vm\.tiktok\.com\/(?<id>\w+)/u.exec(url)?.groups?.id ??
    null,
  twitter: (url) =>
    /(?:twitter\.com|x\.com)\/(?:\w+|i)\/status\/(?<id>\d+)/u.exec(url)?.groups?.id ?? null,
  youtube: (url) =>
    /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)(?<id>[^&?\s]+)/u.exec(url)?.groups?.id ??
    null,
};

// Returns video ID for embedding
export const extractVideoId = (url: string, platform: VideoPlatform): string | null =>
  extractors[platform](url);
