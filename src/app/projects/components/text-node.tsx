import type { NodeProps } from "reactflow";
import { memo } from "react";

import { AnimateText } from "@/components/animate-text";
import styles from "./text-node.module.css";

export type TextNodeData = {
  title?: string;
};

export const TextNode = memo(({ data }: NodeProps<TextNodeData>) => {
  return (
    <header className={styles.header}>
      <AnimateText className={styles.title}>{data.title}</AnimateText>
    </header>
  );
});

TextNode.displayName = "TextNode";
