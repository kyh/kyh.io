import type { Metadata } from "next";

import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Total Compensation Calculator",
  description: "Calculate and visualize your total compensation",
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
  <html lang="en" className="dark">
    <body className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      {children}
    </body>
  </html>
);

export default RootLayout;
