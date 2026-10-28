import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GeistSans } from "geist/font/sans";

import { Dock } from "@/components/dock";
import { Multiplayer } from "@/components/multiplayer/cursors";
import { Providers } from "@/components/providers";
import { ThemeScript } from "@/themes/theme-script";
import { ThemeCorners } from "@/themes/corners";
import { ThemeDrift } from "@/themes/drift";
import { ThemeTrail } from "@/themes/trail";
import { siteConfig } from "@/lib/config";
import { JsonLd, VideoJsonLd } from "@/components/json-ld";
import { ogVideoOf } from "@/lib/page-metadata";
import { todaysVideo } from "@/lib/todays-video";

import "@/styles/global.css";

/**
 * The defaults every route starts from (a 404 keeps them whole): today's clip
 * as `og:video` and its poster leading `og:image`, as on the homepage.
 */
export const generateMetadata = async (): Promise<Metadata> => {
  const video = await todaysVideo();
  return {
    description: siteConfig.description,
    icons: [
      {
        rel: "icon",
        sizes: "96x96",
        type: "image/png",
        url: `${siteConfig.url}/favicon/favicon-96x96.png`,
      },
      {
        rel: "icon",
        type: "image/svg+xml",
        url: `${siteConfig.url}/favicon/favicon.svg`,
      },
      {
        rel: "shortcut icon",
        url: `${siteConfig.url}/favicon/favicon.ico`,
      },
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        url: `${siteConfig.url}/favicon/apple-touch-icon.png`,
      },
      {
        rel: "manifest",
        url: `${siteConfig.url}/favicon/site.webmanifest`,
      },
    ],
    metadataBase: new URL(siteConfig.url),
    openGraph: {
      description: siteConfig.description,
      images: [video.poster],
      locale: "en-US",
      siteName: siteConfig.name,
      title: siteConfig.name,
      type: "website",
      url: siteConfig.url,
      videos: [ogVideoOf(video)],
    },
    other: {
      "apple-mobile-web-app-title": siteConfig.shortName,
    },
    title: {
      default: siteConfig.name,
      template: `%s | ${siteConfig.name}`,
    },
    twitter: {
      card: "summary_large_image",
      creator: siteConfig.creator,
      description: siteConfig.description,
      images: [video.poster],
      title: siteConfig.name,
    },
  };
};

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="en" className={GeistSans.className} suppressHydrationWarning>
    <head>
      <ThemeScript />
    </head>
    <body>
      <JsonLd />
      <VideoJsonLd />
      <Providers>
        <div className="blur-header" aria-hidden="true" />
        <ThemeDrift />
        <ThemeCorners />
        <ThemeTrail />
        <Multiplayer />
        <Dock />
        {children}
      </Providers>
      <Analytics />
      <SpeedInsights />
    </body>
  </html>
);

export default RootLayout;
