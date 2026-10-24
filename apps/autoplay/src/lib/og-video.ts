import { siteConfig } from "@/lib/site-config";

/**
 * The TV as a short scene (`scripts/og-video/autoplay.html` at the repo root,
 * recorded by `pnpm og:video autoplay`): static in the window chrome, the
 * channel flipping through the station's formats, then the name.
 */
export const ogVideo = {
  duration: "PT8.5S",
  height: 630,
  poster: `${siteConfig.url}/og/og.jpg`,
  type: "video/mp4",
  uploadDate: "2026-10-24",
  url: `${siteConfig.url}/og/og.mp4`,
  width: 1200,
};

/** JSON-LD for the one public page: the app, the site and the clip. */
export const structuredData = {
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
      "@id": `${siteConfig.url}/#app`,
      "@type": "WebApplication",
      applicationCategory: "EntertainmentApplication",
      author: { "@type": "Person", name: "Kaiyu Hsu", url: "https://www.kyh.io" },
      browserRequirements: "Requires JavaScript and WebRTC",
      description: siteConfig.description,
      image: `${siteConfig.url}/opengraph-image`,
      name: siteConfig.name,
      operatingSystem: "Any",
      url: siteConfig.url,
      video: { "@id": `${siteConfig.url}/#video` },
    },
    {
      "@id": `${siteConfig.url}/#video`,
      "@type": "VideoObject",
      contentUrl: ogVideo.url,
      description: `${siteConfig.name}: ${siteConfig.description}`,
      duration: ogVideo.duration,
      embedUrl: siteConfig.url,
      height: ogVideo.height,
      name: `${siteConfig.name}: flipping channels`,
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
