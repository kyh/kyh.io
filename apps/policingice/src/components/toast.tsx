"use client";

import { animate } from "../app/styles/animations.stylex";
import { spacing } from "@repo/tailwind-compat/tokens.stylex";

import * as stylex from "@stylexjs/stylex";

import { useTheme } from "next-themes";
import { Toaster as Sonner, toast, type ToasterProps } from "sonner";
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react";

const styles = stylex.create({
  icon: { width: spacing[4], height: spacing[4] },
});

// SAFETY: CSS custom properties are valid inline styles, but React.CSSProperties
// has no index signature for `--*` keys; the object holds nothing else.
const toasterStyle = {
  "--normal-bg": "var(--popover)",
  "--normal-text": "var(--popover-foreground)",
  "--normal-border": "var(--border)",
  "--border-radius": "var(--radius)",
} as React.CSSProperties;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const toasterTheme: ToasterProps["theme"] =
    theme === "light" || theme === "dark" ? theme : "system";

  return (
    <Sonner
      theme={toasterTheme}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon {...stylex.props(styles.icon)} />,
        info: <InfoIcon {...stylex.props(styles.icon)} />,
        warning: <TriangleAlertIcon {...stylex.props(styles.icon)} />,
        error: <OctagonXIcon {...stylex.props(styles.icon)} />,
        loading: <Loader2Icon {...stylex.props(styles.icon, animate.spin)} />,
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

export { Toaster, toast };
