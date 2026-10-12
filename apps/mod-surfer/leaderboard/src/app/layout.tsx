import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  description: "Who kept Claude running the longest: each player's best run, by output tokens.",
  metadataBase: new URL("https://clauders.kyh.io"),
  title: "Subway Clauders",
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#10131f",
};

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="en">
    <body>{children}</body>
  </html>
);

export default RootLayout;
