import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Rubik, Titan_One } from "next/font/google";
import type { ReactNode } from "react";

import { SITE_URL } from "@/lib/site";

import "./globals.css";

const display = Titan_One({ subsets: ["latin"], variable: "--font-display", weight: "400" });
const body = Rubik({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

const description =
  "An endless runner for Claude Code. Clawd runs while Claude works, and every output token is a point. See who kept Claude going the longest.";

export const metadata: Metadata = {
  description,
  metadataBase: new URL(SITE_URL),
  openGraph: {
    description,
    siteName: "Clawders",
    title: "Clawders",
    type: "website",
    url: SITE_URL,
  },
  title: "Clawders",
  twitter: {
    card: "summary_large_image",
    creator: "@kaiyuhsu",
    description,
    title: "Clawders",
  },
};

export const viewport: Viewport = {
  themeColor: "#121316",
};

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html className={`${display.variable} ${body.variable} ${mono.variable}`} lang="en">
    <body>{children}</body>
  </html>
);

export default RootLayout;
