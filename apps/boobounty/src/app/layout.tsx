import type { Metadata, Viewport } from "next";
import { Anton, Fraunces, IBM_Plex_Mono, UnifrakturMaguntia } from "next/font/google";
import type { ReactNode } from "react";

import { siteConfig } from "@/lib/site";

import "./globals.css";

const fraunces = Fraunces({ axes: ["opsz"], subsets: ["latin"], variable: "--font-fraunces" });
const anton = Anton({ subsets: ["latin"], variable: "--font-anton", weight: "400" });
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["400", "500"],
});
const blackletter = UnifrakturMaguntia({
  subsets: ["latin"],
  variable: "--font-blackletter",
  weight: "400",
});
const fonts = [fraunces, anton, plexMono, blackletter].map((font) => font.variable).join(" ");

const title = `${siteConfig.name}: ${siteConfig.tagline}`;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    description: siteConfig.description,
    locale: "en-US",
    siteName: siteConfig.name,
    title,
    type: "website",
    url: siteConfig.url,
  },
  title,
  twitter: {
    card: "summary_large_image",
    creator: siteConfig.twitter,
    description: siteConfig.description,
    title,
  },
};

export const viewport: Viewport = {
  themeColor: "#fcf3cf",
};

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html className={fonts} lang="en">
    <body>{children}</body>
  </html>
);

export default RootLayout;
