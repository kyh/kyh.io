import type { Metadata, Viewport } from "next";

import { siteConfig } from "@/lib/site-config";

import "./styles/globals.css";

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
};

export const viewport: Viewport = {
  themeColor: "#0d0515",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

type LayoutProps = {
  children: React.ReactNode;
};

const RootLayout = (props: LayoutProps) => {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground font-mono antialiased">
        {props.children}
      </body>
    </html>
  );
};

export default RootLayout;
