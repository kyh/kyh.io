"use client";

import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "./tooltip";
import { ScreenProvider } from "./screen";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ScreenProvider>
        <TooltipProvider delayDuration={0} skipDelayDuration={0}>
          {children}
        </TooltipProvider>
      </ScreenProvider>
    </ThemeProvider>
  );
}
