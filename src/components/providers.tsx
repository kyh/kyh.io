"use client";

import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "./tooltip";
import { ViewportProvider } from "./viewport";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ViewportProvider>
        <TooltipProvider delayDuration={500}>{children}</TooltipProvider>
      </ViewportProvider>
    </ThemeProvider>
  );
}
