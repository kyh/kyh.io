import { theme } from "./styles/tokens.stylex";
import { radii, spacing } from "@repo/tailwind-compat/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";

import { ThemeProvider } from "@/components/theme";
import { Toaster } from "@/components/toast";

import "./styles/globals.css";

const styles = stylex.create({
  skipLink: {
    position: { default: "absolute", ":focus": "absolute" },
    width: { default: 1, ":focus": "auto" },
    height: { default: 1, ":focus": "auto" },
    padding: { default: 0, ":focus": null },
    margin: { default: -1, ":focus": 0 },
    overflow: { default: "hidden", ":focus": "visible" },
    clipPath: { default: "inset(50%)", ":focus": "none" },
    whiteSpace: { default: "nowrap", ":focus": "normal" },
    borderWidth: 0,
    top: { default: null, ":focus": spacing[4] },
    left: { default: null, ":focus": spacing[4] },
    zIndex: { default: null, ":focus": 50 },
    borderRadius: { default: null, ":focus": radii.default },
    backgroundColor: { default: null, ":focus": theme.foreground },
    paddingInline: { default: null, ":focus": spacing[4] },
    paddingBlock: { default: null, ":focus": spacing[2] },
    color: { default: null, ":focus": theme.background },
  },
});

const siteUrl = "https://www.policingice.com";
const siteName = "Policing ICE";
const siteDescription =
  "Documenting and tracking incidents of ICE overreach across the United States. Community-driven accountability through video evidence.";

export const metadata: Metadata = {
  title: siteName,
  description: siteDescription,
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: "website",
    siteName,
    title: siteName,
    description: siteDescription,
    url: siteUrl,
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: siteDescription,
    images: ["/og-image.png"],
  },
  icons: [
    { rel: "icon", type: "image/svg+xml", url: "/favicon/favicon.svg" },
    { rel: "icon", type: "image/png", sizes: "96x96", url: "/favicon/favicon-96x96.png" },
    { rel: "icon", type: "image/x-icon", url: "/favicon/favicon.ico" },
    { rel: "apple-touch-icon", sizes: "180x180", url: "/favicon/apple-touch-icon.png" },
  ],
  manifest: "/favicon/site.webmanifest",
  other: {
    "theme-color": "#ffffff",
  },
};

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <a href="#main-content" {...stylex.props(styles.skipLink)}>
            Skip to content
          </a>
          {children}
          <Toaster />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
};

export default RootLayout;
