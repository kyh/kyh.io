import type { VideoPlatform } from "@/db/schema";

export function detectPlatform(url: string): VideoPlatform {
  const u = url.toLowerCase();
  if (u.includes("twitter.com") || u.includes("x.com")) return "twitter";
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("tiktok.com")) return "tiktok";
  if (u.includes("facebook.com") || u.includes("fb.watch")) return "facebook";
  if (u.includes("instagram.com")) return "instagram";
  if (u.includes("linkedin.com")) return "linkedin";
  if (u.includes("pinterest.com") || u.includes("pin.it")) return "pinterest";
  if (u.includes("reddit.com") || u.includes("redd.it")) return "reddit";
  throw new Error(
    "Unsupported platform. Use Twitter, YouTube, TikTok, Facebook, Instagram, LinkedIn, Pinterest, or Reddit links.",
  );
}

export function isValidVideoUrl(url: string): boolean {
  try {
    detectPlatform(url);
    return true;
  } catch {
    return false;
  }
}

// Resolve Twitter/X URLs that use /i/status/ format to the actual URL with username
export async function resolveVideoUrl(url: string): Promise<string> {
  // Check if it's a Twitter/X URL with /i/status/ pattern
  const match = url.match(
    /^https?:\/\/(twitter\.com|x\.com)\/i\/status\/(\d+)/,
  );
  if (!match) {
    return url;
  }

  try {
    // Fetch with redirect: manual to get the Location header
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
    });

    const location = response.headers.get("location");
    if (location && isValidVideoUrl(location)) {
      return location;
    }

    // If no redirect, try following with GET
    const getResponse = await fetch(url, {
      redirect: "follow",
    });

    // The final URL after redirects
    if (getResponse.url && isValidVideoUrl(getResponse.url)) {
      return getResponse.url;
    }
  } catch (error) {
    console.error("Failed to resolve Twitter URL:", url, error);
  }

  return url;
}

// Returns true if URL is valid for embedding (we just need to detect platform)
export function extractVideoId(
  url: string,
  platform: VideoPlatform,
): string | null {
  // For react-social-media-embed, we just need the full URL
  // Return a truthy value if the URL matches the platform
  switch (platform) {
    case "youtube": {
      const match = url.match(
        /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([^&?\s]+)/,
      );
      return match?.[1] ?? null;
    }
    case "twitter": {
      const match = url.match(
        /(?:twitter\.com|x\.com)\/(?:\w+|i)\/status\/(\d+)/,
      );
      return match?.[1] ?? null;
    }
    case "tiktok": {
      const videoMatch = url.match(/tiktok\.com\/@[\w.]+\/video\/(\d+)/);
      if (videoMatch) return videoMatch[1];
      const vmMatch = url.match(/vm\.tiktok\.com\/(\w+)/);
      return vmMatch?.[1] ?? null;
    }
    case "facebook": {
      // Facebook URLs vary widely, just check it's a valid FB URL
      if (url.includes("facebook.com") || url.includes("fb.watch"))
        return "facebook";
      return null;
    }
    case "instagram": {
      const match = url.match(/instagram\.com\/(?:p|reel|tv)\/([^/?]+)/);
      return match?.[1] ?? null;
    }
    case "linkedin": {
      if (url.includes("linkedin.com")) return "linkedin";
      return null;
    }
    case "pinterest": {
      if (url.includes("pinterest.com") || url.includes("pin.it"))
        return "pinterest";
      return null;
    }
    case "reddit": {
      if (url.includes("reddit.com") || url.includes("redd.it"))
        return "reddit";
      return null;
    }
  }
}
