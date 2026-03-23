import type { Metadata } from "next";

import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "A Visual Introduction to Machine Learning",
  description: "Interactive visualization explaining linear regression and machine learning concepts",
};

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="en">
    <body>{children}</body>
  </html>
);

export default RootLayout;
