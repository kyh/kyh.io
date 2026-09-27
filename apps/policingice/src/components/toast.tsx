"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";
import type { ToasterProps } from "sonner";
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react";

export { toast } from "sonner";

// SAFETY: CSS custom properties are valid inline styles, but React.CSSProperties
// has no index signature for `--*` keys; the object holds nothing else.
const toasterStyle = {
  "--border-radius": "var(--radius)",
  "--normal-bg": "var(--popover)",
  "--normal-border": "var(--border)",
  "--normal-text": "var(--popover-foreground)",
} as React.CSSProperties;

export const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const toasterTheme: ToasterProps["theme"] =
    theme === "light" || theme === "dark" ? theme : "system";

  return (
    <Sonner
      theme={toasterTheme}
      className="toaster group"
      icons={{
        error: <OctagonXIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
        success: <CircleCheckIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
      }}
      style={toasterStyle}
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  );
};
