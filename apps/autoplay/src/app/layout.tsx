import type { Metadata, Viewport } from "next";

import { siteConfig } from "@/lib/site-config";

import "./styles/globals.css";

export const metadata: Metadata = {
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    description: siteConfig.description,
    locale: "en-US",
    siteName: siteConfig.name,
    title: siteConfig.name,
    type: "website",
    url: siteConfig.url,
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
    <body className="antialiased">{props.children}</body>
  </html>
);

export default RootLayout;
