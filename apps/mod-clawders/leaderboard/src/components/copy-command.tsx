"use client";

import { useState } from "react";

// A command to paste into Claude Code or a shell, with a button that copies it.
export const CopyCommand = ({ command }: { command: string }) => {
  const [isCopied, setIsCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(command);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1600);
  };

  return (
    <div className="command">
      <code>{command}</code>
      <button onClick={copy} type="button">
        {isCopied ? "Copied" : "Copy"}
      </button>
    </div>
  );
};
