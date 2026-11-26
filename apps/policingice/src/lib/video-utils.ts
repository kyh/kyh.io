import type { VideoPlatform } from "@/db/drizzle-schema";

export const detectPlatform: (url: string) => VideoPlatform = (url) => {
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

export const isValidVideoUrl = (url: string) => {
  try {
    detectPlatform(url);

    return true;
  } catch {
    return false;
  }
};

const FETCH_TIMEOUT_MS = 5000;

// WARNING: SSRF guard; every fetch and every redirect it follows must land on one of these hosts.
const ALLOWED_TWITTER_HOSTS = new Set(["twitter.com", "x.com"]);

const isAllowedTwitterHost = (url: string) => {
  try {
    const parsed = new URL(url);

    return ALLOWED_TWITTER_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
};

const fetchWithTimeout = async (url: string, options: RequestInit) => {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, FETCH_TIMEOUT_MS);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

export const resolveVideoUrl = async (url: string) => {
  if (!/^https?:\/\/(?:twitter\.com|x\.com)\/i\/status\/\d+/u.test(url)) {
    return url;
  }

  if (!isAllowedTwitterHost(url)) {
    return url;
  }

  try {
    const response = await fetchWithTimeout(url, {
      method: "HEAD",
      redirect: "manual",
    });

    const location = response.headers.get("location");

    if (
      location !== null &&
      location !== "" &&
      isAllowedTwitterHost(location) &&
      isValidVideoUrl(location)
    ) {
      return location;
    }

    const getResponse = await fetchWithTimeout(url, {
      redirect: "follow",
    });

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

export const extractInstagramType = (url: string) => {
  if (url.includes("/reel/")) {
    return "reel" satisfies "p" | "reel" | "tv";
  }

  if (url.includes("/tv/")) {
    return "tv" satisfies "p" | "reel" | "tv";
  }

  return "p" satisfies "p" | "reel" | "tv";
};

const hostMarkerId = (url: string, markers: string[], id: string) =>
  markers.some((marker) => url.includes(marker)) ? id : null;

const extractors: Record<VideoPlatform, (url: string) => string | null> = {
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

export const extractVideoId = (url: string, platform: VideoPlatform) => extractors[platform](url);
