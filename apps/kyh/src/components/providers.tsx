"use client";

import { ThemeProvider } from "next-themes";

import { EasterEggProvider } from "@/easter-eggs/provider";

import { MultiplayerProvider } from "./multiplayer/provider";
import { TooltipProvider } from "./tooltip";

export const Providers = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>
    <TooltipProvider>
      <MultiplayerProvider>
        <EasterEggProvider>{children}</EasterEggProvider>
      </MultiplayerProvider>
    </TooltipProvider>
  </ThemeProvider>
);
