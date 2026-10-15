"use client";

import { ThemeProvider } from "next-themes";

import { MultiplayerProvider } from "./multiplayer/provider";
import { TooltipProvider } from "./tooltip";
import { ViewportProvider } from "./viewport";

export const Providers = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>
    <TooltipProvider>
      <ViewportProvider>
        <MultiplayerProvider>{children}</MultiplayerProvider>
      </ViewportProvider>
    </TooltipProvider>
  </ThemeProvider>
);
