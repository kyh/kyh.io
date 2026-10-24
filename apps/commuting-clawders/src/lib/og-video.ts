import { SITE_URL } from "@/lib/site";

export const description = "Keep Clawd running";

/**
 * The demo as a short scene (`scripts/og-video/commuting-clawders.html` at
 * the repo root, recorded by `pnpm og:video commuting-clawders`): a Claude
 * Code session beside Clawd's run, the score ticking up with every token.
 */
export const ogVideo = {
  duration: "PT9S",
  height: 630,
  poster: `${SITE_URL}/og/og.jpg`,
  type: "video/mp4",
  uploadDate: "2026-10-24",
  url: `${SITE_URL}/og/og.mp4`,
  width: 1200,
};

/** JSON-LD for the site: the site, the game (a Claude Code plugin) and its clip. */
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@id": `${SITE_URL}/#website`,
      "@type": "WebSite",
      description,
      inLanguage: "en-US",
      name: "Commuting Clawders",
      url: SITE_URL,
    },
    {
      "@id": `${SITE_URL}/#game`,
      "@type": ["VideoGame", "SoftwareApplication"],
      applicationCategory: "GameApplication",
      applicationSubCategory: "Claude Code plugin",
      author: { "@type": "Person", name: "Kaiyu Hsu", url: "https://www.kyh.io" },
      description:
        "A self-playing endless runner starring Clawd that runs while Claude works, with a shared leaderboard.",
      gamePlatform: "Claude Code",
      genre: "Endless runner",
      image: `${SITE_URL}/opengraph-image`,
      installUrl: "https://github.com/kyh/kyh.io",
      isAccessibleForFree: true,
      name: "Commuting Clawders",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      operatingSystem: "macOS, Linux",
      trailer: { "@id": `${SITE_URL}/#video` },
      url: SITE_URL,
    },
    {
      "@id": `${SITE_URL}/#video`,
      "@type": "VideoObject",
      contentUrl: ogVideo.url,
      description: "Clawd running while a Claude Code session works, one point a token.",
      duration: ogVideo.duration,
      embedUrl: SITE_URL,
      height: ogVideo.height,
      name: "Commuting Clawders demo",
      thumbnailUrl: ogVideo.poster,
      uploadDate: ogVideo.uploadDate,
      width: ogVideo.width,
    },
  ],
};

/** Escapes `<` so no value can close the inline script early. */
export const serializedStructuredData = JSON.stringify(structuredData).replaceAll(
  "<",
  String.raw`\u003c`,
);
