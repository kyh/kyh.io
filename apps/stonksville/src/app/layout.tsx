import type { Metadata, Viewport } from "next";

import { siteConfig } from "@/lib/site-config";

import "./styles/globals.css";

export const metadata: Metadata = {
  description: siteConfig.description,
  icons: [
    { rel: "icon", type: "image/svg+xml", url: "/favicon/favicon.svg" },
    { rel: "icon", sizes: "96x96", type: "image/png", url: "/favicon/favicon-96x96.png" },
    { rel: "icon", type: "image/x-icon", url: "/favicon/favicon.ico" },
    { rel: "apple-touch-icon", sizes: "180x180", url: "/favicon/apple-touch-icon.png" },
  ],
  manifest: "/favicon/site.webmanifest",
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    description: siteConfig.description,
    images: [{ height: 630, url: "/og.png", width: 1200 }],
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
    images: ["/og.png"],
    title: siteConfig.name,
  },
};

export const viewport: Viewport = {
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0d0515",
  userScalable: false,
  width: "device-width",
};

interface LayoutProps {
  children: React.ReactNode;
}

const RootLayout = (props: LayoutProps) => (
  <html lang="en" className="dark">
    <body className="bg-background text-foreground font-mono antialiased">{props.children}</body>
  </html>
);

export default RootLayout;
