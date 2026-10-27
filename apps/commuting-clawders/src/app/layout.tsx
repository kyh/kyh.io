import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import type { ReactNode } from "react";

import { description, ogVideo, serializedStructuredData } from "@/lib/og-video";
import { SITE_URL } from "@/lib/site";

import "./globals.css";

const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  description,
  metadataBase: new URL(SITE_URL),
  openGraph: {
    description,
    locale: "en-US",
    siteName: "Commuting Clawders",
    title: "Commuting Clawders",
    type: "website",
    url: SITE_URL,
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
    <body>
      <script
        type="application/ld+json"
        // oxlint-disable-next-line react/no-danger -- the only way to emit a JSON-LD body; `<` is escaped so no value can close the tag
        dangerouslySetInnerHTML={{ __html: serializedStructuredData }}
      />
      {children}
    </body>
  </html>
);

export default RootLayout;
