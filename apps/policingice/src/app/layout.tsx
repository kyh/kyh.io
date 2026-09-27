import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";

import { ThemeProvider } from "@/components/theme";
import { Toaster } from "@/components/toast";

import "./styles/globals.css";

const siteUrl = "https://www.policingice.com";
const siteName = "Policing ICE";
const siteDescription =
  "Documenting and tracking incidents of ICE overreach across the United States. Community-driven accountability through video evidence.";

export const metadata: Metadata = {
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
    images: [{ height: 630, url: "/og-image.png", width: 1200 }],
    siteName,
    title: siteName,
    type: "website",
    url: siteUrl,
  },
  other: {
    "theme-color": "#ffffff",
  },
  title: siteName,
  twitter: {
    card: "summary_large_image",
    description: siteDescription,
    images: ["/og-image.png"],
    title: siteName,
  },
};

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="en" suppressHydrationWarning>
    <body>
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
