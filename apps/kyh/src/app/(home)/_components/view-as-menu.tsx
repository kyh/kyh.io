"use client";

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

const iconButtonClassName =
  "inline-flex -m-1 p-1 rounded-sm text-foreground-faded transition-colors duration-150 hover:text-foreground-highlighted hover:bg-background-hover";

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
    <div className="flex h-4 items-center gap-2">
      <Tooltip>
        <AnimateSection delay={0.1}>
          <TooltipTrigger asChild>
            <a
              className={iconButtonClassName}
              aria-label="Speed read"
              href="/rsvp"
            >
              <TextIcon />
            </a>
          </TooltipTrigger>
        </AnimateSection>
        <TooltipContent className="px-2 py-0.5 text-xs">
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
        <TooltipContent className="px-2 py-0.5 text-xs">
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
                <code className="rounded border border-[color-mix(in_srgb,var(--border-color)_50%,transparent)] bg-[color-mix(in_srgb,var(--bg-color)_20%,transparent)] px-1.5 font-mono text-[0.7rem]">
                  {COMMAND}
                </code>
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
        <TooltipContent className="px-2 py-0.5 text-xs">
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
            <Menu.Popup className="bg-panel z-50 min-w-[120px] rounded-md border border-[var(--border-color)] p-1 text-xs text-[var(--body-color)]">
              <Menu.Item
                className="hover:bg-background-hover flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 outline-none"
                render={
                  <a
                    href={chatGPTUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                <ChatGPTIcon />
                ChatGPT
              </Menu.Item>
              <Menu.Item
                className="hover:bg-background-hover flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 outline-none"
                render={
                  <a
                    href={claudeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
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
