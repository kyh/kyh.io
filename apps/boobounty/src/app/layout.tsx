import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import type { ReactNode } from "react";

import { siteConfig } from "@/lib/site";

import "./globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-geist" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const serif = Instrument_Serif({
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-instrument",
  weight: "400",
});

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
  themeColor: "#f7f2e8",
};

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html className={`${sans.variable} ${mono.variable} ${serif.variable}`} lang="en">
    <body>{children}</body>
  </html>
);

export default RootLayout;
