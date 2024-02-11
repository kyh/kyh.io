import { memo } from "react";
import { NodeProps } from "reactflow";
import Image from "next/image";
import { Card } from "~/components/card";
import styles from "./card-node.module.css";

export type CardNodeData = {
  link?: { url: string; text?: string };
  title?: string;
  backgroundImage?: string;
  backgroundBlurData?: string;
  backgroundVideo?: string;
};

export const CardNode = memo(({ data }: NodeProps<CardNodeData>) => {
  return (
    <Card>
      <span className={`${styles.handle} handle`}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="9" cy="12" r="1" />
          <circle cx="9" cy="5" r="1" />
          <circle cx="9" cy="19" r="1" />
          <circle cx="15" cy="12" r="1" />
          <circle cx="15" cy="5" r="1" />
          <circle cx="15" cy="19" r="1" />
        </svg>
      </span>
      <a
        className={styles.cardContent}
        href={data.link?.url}
        target="_blank"
        rel="noreferrer noopener"
      >
        {data.title && (
          <header className={styles.header}>
            <h2>{data.title}</h2>
          </header>
        )}
        {data.backgroundImage && (
          <Image
            className={styles.bgImage}
            src={data.backgroundImage}
            alt={data.title || "Card Image"}
            blurDataURL={data.backgroundBlurData}
            placeholder="blur"
            width="400"
            height="300"
          />
        )}
        {data.backgroundVideo && (
          <video autoPlay muted loop className={styles.bgVideo}>
            <source src={data.backgroundVideo} type="video/webm" />
            Unsupported.
          </video>
        )}
        {data.link && data.link.text && (
          <footer className={styles.footer}>
            <span className={styles.linkText}>
              {data.link.text}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 3h6v6" />
                <path d="M10 14 21 3" />
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              </svg>
            </span>
          </footer>
        )}
      </a>
    </Card>
  );
});
