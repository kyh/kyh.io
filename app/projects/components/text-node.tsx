import { memo } from "react";
import { NodeProps } from "reactflow";
import styles from "./text-node.module.css";
import { AnimateText } from "~/components/animate-text";

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
