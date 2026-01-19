"use client";

import { ThemeProvider } from "next-themes";

import { TooltipProvider } from "./tooltip";
import { ViewportProvider } from "./viewport";

export const Providers = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>
    <TooltipProvider>
      <ViewportProvider>{children}</ViewportProvider>
    </TooltipProvider>
  </ThemeProvider>
);
