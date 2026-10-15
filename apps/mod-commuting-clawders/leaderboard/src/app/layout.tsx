import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import type { ReactNode } from "react";

import { SITE_URL } from "@/lib/site";

import "./globals.css";

const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

const description = "Keep Clawd running";

export const metadata: Metadata = {
  description,
  metadataBase: new URL(SITE_URL),
  openGraph: {
    description,
    siteName: "Commuting Clawders",
    title: "Commuting Clawders",
    type: "website",
    url: SITE_URL,
  },
  title: "Commuting Clawders",
  twitter: {
    card: "summary_large_image",
    creator: "@kaiyuhsu",
    description,
    title: "Commuting Clawders",
  },
};

export const viewport: Viewport = {
  themeColor: "#121316",
};

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html className={mono.variable} lang="en">
    <body>{children}</body>
  </html>
);

export default RootLayout;
