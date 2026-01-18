"use client";

import {
  ChatGPTIcon,
  ClaudeIcon,
  MarkdownIcon,
  TerminalIcon,
} from "@/components/icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/tooltip";

const iconButtonClassName =
  "-m-1 p-1 transition text-foreground-faded hover:text-foreground-highlighted hover:bg-[color-mix(in_srgb,var(--bg-color)_50%,transparent)] rounded-sm";

export const ViewAsMenu = () => {
  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger
          className={iconButtonClassName}
          aria-label="Open with CLI"
          onClick={() => {
            // TODO: Implement open with CLI
            console.log("Open with CLI");
          }}
        >
          <TerminalIcon />
        </TooltipTrigger>
        <TooltipContent className="px-2 py-0.5 text-xs">
          Open with CLI
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          className={iconButtonClassName}
          aria-label="View as Markdown"
          onClick={() => {
            // TODO: Implement view as markdown
            console.log("View as markdown");
          }}
        >
          <MarkdownIcon />
        </TooltipTrigger>
        <TooltipContent className="px-2 py-0.5 text-xs">
          View as Markdown
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          className={iconButtonClassName}
          aria-label="Open in ChatGPT"
          onClick={() => {
            // TODO: Implement open in ChatGPT
            console.log("Open in ChatGPT");
          }}
        >
          <ChatGPTIcon />
        </TooltipTrigger>
        <TooltipContent className="px-2 py-0.5 text-xs">
          Open in ChatGPT
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          className={iconButtonClassName}
          aria-label="Open in Claude"
          onClick={() => {
            // TODO: Implement open in Claude
            console.log("Open in Claude");
          }}
        >
          <ClaudeIcon />
        </TooltipTrigger>
        <TooltipContent className="px-2 py-0.5 text-xs">
          Open in Claude
        </TooltipContent>
      </Tooltip>
    </div>
  );
};
