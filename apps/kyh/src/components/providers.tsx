"use client";

import { ThemeProvider } from "next-themes";

import { ViewportProvider } from "./viewport";

export const Providers = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>
    <ViewportProvider>{children}</ViewportProvider>
  </ThemeProvider>
);
