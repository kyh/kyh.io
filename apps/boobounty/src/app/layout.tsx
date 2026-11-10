import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

import { siteConfig } from "@/lib/site";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

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
  themeColor: "#f5f5f7",
};

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html className={inter.variable} lang="en">
    <body>{children}</body>
  </html>
);

export default RootLayout;
