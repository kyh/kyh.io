import { siteConfig } from "@/lib/site-config";

/**
 * The real game, recorded from a running build by `pnpm og:video
 * stonksville` (scripts/og-video.mjs at the repo root): the S&P 500 replaying
 * a stretch of its real daily history while bets go down on the grid ahead of
 * the price. Its last beat is crossfaded over its first, so it loops.
 */
export const ogVideo = {
  duration: "PT8S",
  height: 630,
  poster: `${siteConfig.url}/og/og.jpg`,
  type: "video/mp4",
  uploadDate: "2026-10-25",
  url: `${siteConfig.url}/og/og.mp4`,
  width: 1200,
};

/** The share card `app/opengraph-image.tsx` draws; Next adds it to og:image and twitter:image. */
export const ogImage = {
  alt: `${siteConfig.name}: a live S&P 500 price chart you tap to bet on`,
  height: 630,
  width: 1200,
};

/** JSON-LD for the one page: the site, the game and its clip. */
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@id": `${siteConfig.url}/#website`,
      "@type": "WebSite",
      description: siteConfig.description,
      inLanguage: "en-US",
      name: siteConfig.name,
      url: siteConfig.url,
    },
    {
      "@id": `${siteConfig.url}/#game`,
      "@type": ["VideoGame", "WebApplication"],
      applicationCategory: "GameApplication",
      author: { "@type": "Person", name: "Kaiyu Hsu", url: "https://www.kyh.io" },
      browserRequirements: "Requires JavaScript",
      description: siteConfig.description,
      gamePlatform: "Web browser",
      genre: ["Trading", "Arcade"],
      image: `${siteConfig.url}/opengraph-image`,
      isAccessibleForFree: true,
      name: siteConfig.name,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      operatingSystem: "Any",
      playMode: "SinglePlayer",
      trailer: { "@id": `${siteConfig.url}/#video` },
      url: siteConfig.url,
    },
    {
      "@id": `${siteConfig.url}/#video`,
      "@type": "VideoObject",
      contentUrl: ogVideo.url,
      description: `${siteConfig.name}: ${siteConfig.description}`,
      duration: ogVideo.duration,
      embedUrl: siteConfig.url,
      height: ogVideo.height,
      name: `${siteConfig.name} gameplay`,
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
