import localFont from "next/font/local";
import { Providers } from "~/components/providers";
import { Dock } from "~/components/dock";
import styles from "~/components/page.module.css";

import "./global.css";

const gilroy = localFont({
  src: [
    { path: "../public/fonts/gilroy-regular.woff2", weight: "400" },
    { path: "../public/fonts/gilroy-medium.woff2", weight: "500" },
  ],
  variable: "--font-primary",
  display: "swap",
});

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={gilroy.variable}>
      <body>
        <Providers>
          <div className={styles.blurHeader} aria-hidden="true" />
          <Dock />
          {children}
        </Providers>
      </body>
    </html>
  );
}
