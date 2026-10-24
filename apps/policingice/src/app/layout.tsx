import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";

import { ThemeProvider } from "@/components/theme";
import { Toaster } from "@/components/toast";

import { serializeJsonLd, siteJsonLd } from "@/lib/incident-seo";
import { ogImage, siteDescription, siteName, siteUrl } from "@/lib/site";

import "./styles/globals.css";

const siteJsonLdBody = serializeJsonLd(siteJsonLd);

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  description: siteDescription,
  icons: [
    { rel: "icon", type: "image/svg+xml", url: "/favicon/favicon.svg" },
    { rel: "icon", sizes: "96x96", type: "image/png", url: "/favicon/favicon-96x96.png" },
    { rel: "icon", type: "image/x-icon", url: "/favicon/favicon.ico" },
    { rel: "apple-touch-icon", sizes: "180x180", url: "/favicon/apple-touch-icon.png" },
  ],
  manifest: "/favicon/site.webmanifest",
  metadataBase: new URL(siteUrl),
  openGraph: {
    description: siteDescription,
    images: [ogImage],
    locale: "en-US",
    siteName,
    title: siteName,
    type: "website",
    url: siteUrl,
  },
  other: {
    "theme-color": "#ffffff",
  },
  title: { default: siteName, template: `%s | ${siteName}` },
  twitter: {
    card: "summary_large_image",
    description: siteDescription,
    images: [ogImage],
    title: siteName,
  },
};

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="en" suppressHydrationWarning>
    <body>
      <script
        type="application/ld+json"
        // oxlint-disable-next-line react/no-danger -- the only way to emit a JSON-LD body; serializeJsonLd escapes `<`
        dangerouslySetInnerHTML={{ __html: siteJsonLdBody }}
      />
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded focus:bg-foreground focus:px-4 focus:py-2 focus:text-background"
        >
          Skip to content
        </a>
        {children}
        <Toaster />
      </ThemeProvider>
      <Analytics />
    </body>
  </html>
);

export default RootLayout;
