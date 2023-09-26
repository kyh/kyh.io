"use client";

import { ThemeProvider } from "next-themes";
import { ViewportProvider } from "./viewport";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ViewportProvider>{children}</ViewportProvider>
    </ThemeProvider>
  );
}
