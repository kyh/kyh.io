"use client";

import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "./tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
    </ThemeProvider>
  );
}
