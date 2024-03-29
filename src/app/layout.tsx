import { Analytics } from "@vercel/analytics/react";
import { GeistSans } from "geist/font/sans";

import { Dock } from "@/components/dock";
import { Multiplayer } from "@/components/multiplayer";
import { Providers } from "@/components/providers";

import "@/styles/variables.css";
import "@/styles/global.css";

export const metadata = {
  title: {
    default: "Kaiyu Hsu",
    template: "%s | Kaiyu Hsu",
  },
  description:
    "Building things for the interwebs. By day, I get to do that through investing, advising, and working on products you may not have heard of (yet)",
  openGraph: {
    title: "Kaiyu Hsu",
    description:
      "Building things for the interwebs. By day, I get to do that through investing, advising, and working on products you may not have heard of (yet)",
    url: "https://kyh.io",
    siteName: "Kaiyu Hsu",
    images: [
      {
        url: "https://kyh.io/og.jpg",
        width: 1920,
        height: 1080,
      },
    ],
    locale: "en-US",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  twitter: {
    title: "Kaiyu Hsu",
    card: "summary_large_image",
  },
  icons: {
    shortcut: "/favicon.ico",
  },
};

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="en" className={GeistSans.className}>
    <body>
      <Providers>
        <div className="blurHeader" aria-hidden="true" />
        <Multiplayer />
        <Dock />
        {children}
      </Providers>
      <Analytics />
    </body>
  </html>
);

export default RootLayout;
