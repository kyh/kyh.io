import type { Metadata, Viewport } from "next";

import { ogVideo, serializedStructuredData } from "@/lib/og-video";
import { siteConfig } from "@/lib/site-config";

import "./styles/globals.css";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    description: siteConfig.description,
    locale: "en-US",
    siteName: siteConfig.name,
    title: siteConfig.name,
    type: "website",
    url: siteConfig.url,
    videos: [
      {
        height: ogVideo.height,
        secureUrl: ogVideo.url,
        type: ogVideo.type,
        url: ogVideo.url,
        width: ogVideo.width,
      },
    ],
  },
  other: {
    "apple-mobile-web-app-title": siteConfig.shortName,
  },
  title: siteConfig.name,
  twitter: {
    card: "summary_large_image",
    creator: siteConfig.twitter,
    description: siteConfig.description,
    title: siteConfig.name,
  },
};

export const viewport: Viewport = {
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#b429f9",
  userScalable: false,
  width: "device-width",
};

interface LayoutProps {
  children: React.ReactNode;
}

const RootLayout = (props: LayoutProps) => (
  <html lang="en">
    <body className="antialiased">
      <script
        type="application/ld+json"
        // oxlint-disable-next-line react/no-danger -- the only way to emit a JSON-LD body; `<` is escaped so no value can close the tag
        dangerouslySetInnerHTML={{ __html: serializedStructuredData }}
      />
      {props.children}
    </body>
  </html>
);

export default RootLayout;
