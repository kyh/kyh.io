import type { Metadata } from "next";

import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Kwadrants",
  description: "2x2 matrix canvas editor",
  icons: [
    {
      rel: "icon",
      url: "/favicon/favicon.ico",
    },
    {
      rel: "apple-touch-icon",
      sizes: "180x180",
      url: "/favicon/apple-touch-icon.png",
    },
  ],
};

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="en">
    <body className="min-h-screen">{children}</body>
  </html>
);

export default RootLayout;
