"use client";

import { useState } from "react";

export const CopyCommand = ({ command }: { command: string }) => {
  const [label, setLabel] = useState<"Copy" | "Copied" | "Select it">("Copy");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setLabel("Copied");
    } catch {
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
