import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import type { ReactNode } from "react";

import { siteConfig } from "@/lib/site";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const fraunces = Fraunces({ axes: ["opsz"], subsets: ["latin"], variable: "--font-fraunces" });

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
  <html className={`${inter.variable} ${fraunces.variable}`} lang="en">
    <body>{children}</body>
  </html>
);

export default RootLayout;
