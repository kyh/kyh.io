"use client";

import { ThemeProvider } from "next-themes";

import { EasterEggProvider } from "./easter-eggs";
import { TooltipProvider } from "./tooltip";
import { ViewportProvider } from "./viewport";

export const Providers = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>
    <TooltipProvider>
      <ViewportProvider>
        <EasterEggProvider>{children}</EasterEggProvider>
      </ViewportProvider>
    </TooltipProvider>
  </ThemeProvider>
);
