import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";

import { ThemeProvider } from "@/components/theme";
import { ToastProvider } from "@/components/toast";

import "./styles/globals.css";

const siteName = "Bet";
const siteDescription = "Prediction ledger. Track bets and predictions across friend groups.";

export const metadata: Metadata = {
  title: siteName,
  description: siteDescription,
};

const RootLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
};

export default RootLayout;
