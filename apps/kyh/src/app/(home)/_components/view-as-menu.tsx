"use client";

import { theme } from "../../../styles/tokens.stylex";

import {
  defaults,
  fontSizeLineHeights,
  fontSizes,
  radii,
  spacing,
} from "@repo/tailwind-compat/tokens.stylex";

import * as stylex from "@stylexjs/stylex";

import { useState } from "react";
import { Menu } from "@base-ui/react/menu";
import { AnimatePresence, motion } from "motion/react";

import { AnimateSection } from "@/components/animate-text";
import {
  BotIcon,
  ChatGPTIcon,
  ClaudeIcon,
  MarkdownIcon,
  TerminalIcon,
  TextIcon,
} from "@/components/icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/tooltip";

const styles = stylex.create({
  row: { display: "flex", height: spacing[4], alignItems: "center", gap: spacing[2] },
  iconButton: {
    display: "inline-flex",
    margin: `calc(-1 * ${spacing[1]})`,
    padding: spacing[1],
    borderRadius: radii.sm,
    color: { default: theme.foregroundFaded, ":hover": theme.foregroundHighlighted },
    backgroundColor: { default: null, ":hover": theme.backgroundHover },
    transitionProperty:
      "color, background-color, border-color, outline-color, text-decoration-color, fill, stroke",
    transitionTimingFunction: defaults.transitionTimingFunction,
    transitionDuration: ".15s",
  },
  tooltip: {
    paddingInline: spacing[2],
    paddingBlock: spacing[0.5],
    fontSize: fontSizes.xs,
    lineHeight: fontSizeLineHeights.xs,
  },
  code: {
    borderRadius: radii.default,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "color-mix(in srgb, var(--border-color) 50%, transparent)",
    backgroundColor: "color-mix(in srgb, var(--bg-color) 20%, transparent)",
    paddingInline: spacing[1.5],
    fontFamily: defaults.monoFontFamily,
    fontSize: "0.7rem",
  },
  popup: {
    backgroundColor: theme.panel,
    zIndex: 50,
    minWidth: "120px",
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: theme.border,
    padding: spacing[1],
    fontSize: fontSizes.xs,
    lineHeight: fontSizeLineHeights.xs,
    color: theme.foreground,
  },
  menuItem: {
    backgroundColor: { default: null, ":hover": theme.backgroundHover },
    display: "flex",
    cursor: "pointer",
    alignItems: "center",
    gap: spacing[2],
    borderRadius: radii.sm,
    paddingInline: spacing[2],
    paddingBlock: spacing[1.5],
    outline: "none",
  },
});

const iconButtonClassName = stylex.props(styles.iconButton).className;

const COMMAND = "npx kyh";

function getPromptUrl(baseURL: string, url: string) {
  return `${baseURL}?q=${encodeURIComponent(
    `I'm looking at the website of Kaiyu Hsu: ${url}.
Help me understand their background, experience, and work. Be ready to answer questions about their projects, provide insights, or help with similar work.
  `,
  )}`;
}

export const ViewAsMenu = () => {
  const [copied, setCopied] = useState(false);

  const handleCopyCommand = async () => {
    try {
      await navigator.clipboard.writeText(COMMAND);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy command:", err);
    }
  };

  const chatGPTUrl = getPromptUrl("https://chatgpt.com", "https://kyh.io");
  const claudeUrl = getPromptUrl("https://claude.ai/new", "https://kyh.io");

  return (
    <div {...stylex.props(styles.row)}>
      <Tooltip>
        <AnimateSection delay={0.1}>
          <TooltipTrigger asChild>
            <a className={iconButtonClassName} aria-label="Speed read" href="/rsvp">
              <TextIcon />
            </a>
          </TooltipTrigger>
        </AnimateSection>
        <TooltipContent className={stylex.props(styles.tooltip).className}>
          Speed read
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <AnimateSection delay={0.15}>
          <TooltipTrigger
            className={iconButtonClassName}
            aria-label="Open with CLI"
            onClick={handleCopyCommand}
          >
            <TerminalIcon />
          </TooltipTrigger>
        </AnimateSection>
        <TooltipContent className={stylex.props(styles.tooltip).className}>
          <AnimatePresence mode="wait">
            {copied ? (
              <motion.div
                key="copied"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ ease: "easeOut", duration: 0.13 }}
              >
                <span>Copied:</span>
                <code {...stylex.props(styles.code)}>{COMMAND}</code>
              </motion.div>
            ) : (
              <motion.div
                key="default"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ ease: "easeOut", duration: 0.13 }}
              >
                Open as CLI
              </motion.div>
            )}
          </AnimatePresence>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <AnimateSection delay={0.2}>
          <TooltipTrigger asChild>
            <a
              className={iconButtonClassName}
              aria-label="View as Markdown"
              href="/markdown"
              target="_blank"
              rel="noopener noreferrer"
            >
              <MarkdownIcon />
            </a>
          </TooltipTrigger>
        </AnimateSection>
        <TooltipContent className={stylex.props(styles.tooltip).className}>
          View as Markdown
        </TooltipContent>
      </Tooltip>
      <Menu.Root>
        <AnimateSection delay={0.25}>
          <Menu.Trigger className={iconButtonClassName} aria-label="Open in AI">
            <BotIcon />
          </Menu.Trigger>
        </AnimateSection>
        <Menu.Portal>
          <Menu.Positioner sideOffset={5} align="end">
            <Menu.Popup className={stylex.props(styles.popup).className}>
              <Menu.Item
                className={stylex.props(styles.menuItem).className}
                render={<a href={chatGPTUrl} target="_blank" rel="noopener noreferrer" />}
              >
                <ChatGPTIcon />
                ChatGPT
              </Menu.Item>
              <Menu.Item
                className={stylex.props(styles.menuItem).className}
                render={<a href={claudeUrl} target="_blank" rel="noopener noreferrer" />}
              >
                <ClaudeIcon />
                Claude
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
};
