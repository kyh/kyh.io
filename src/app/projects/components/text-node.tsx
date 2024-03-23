import type { NodeProps } from "reactflow";
import { memo } from "react";

import { ScrambleText } from "@/components/animate-text";
import styles from "./text-node.module.css";

export type TextNodeData = {
  title?: string;
};

export const TextNode = memo(({ data }: NodeProps<TextNodeData>) => {
  return (
    <header className={styles.header}>
      <ScrambleText className={styles.title}>{data.title}</ScrambleText>
    </header>
  );
});

TextNode.displayName = "TextNode";
