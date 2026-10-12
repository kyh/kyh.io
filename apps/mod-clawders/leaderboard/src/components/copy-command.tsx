"use client";

import { useState } from "react";

// A command to paste into Claude Code or a shell, with a button that copies it.
export const CopyCommand = ({ command }: { command: string }) => {
  const [label, setLabel] = useState<"Copy" | "Copied" | "Select it">("Copy");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setLabel("Copied");
    } catch {
      // The page has no clipboard access (an iframe, a denied permission).
      setLabel("Select it");
    }
    setTimeout(() => setLabel("Copy"), 1600);
  };

  return (
    <div className="command">
      <code>{command}</code>
      <button onClick={copy} type="button">
        {label}
      </button>
    </div>
  );
};
