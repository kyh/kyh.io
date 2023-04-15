"use client";

import NextLink from "next/link";
import Image from "next/image";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";
import styles from "./link.module.css";

type Props = {
  children: React.ReactNode;
  href?: string;
  noStyles?: boolean;
  noAction?: boolean;
  alt?: string;
  src?: string;
  srcs?: { href: string; src: string; alt: string }[];
};

export const Link = ({
  children,
  href,
  src,
  alt,
  srcs,
  noStyles = false,
  noAction = false,
}: Props) => {
  let content: React.ReactNode = null;
  let action: React.ReactNode = null;

  if (href) {
    if (href.startsWith("/")) {
      action = (
        <NextLink
          className={noStyles ? "" : styles.link}
          href={href}
          data-text={noStyles ? "" : children}
        >
          {children}
        </NextLink>
      );
    } else {
      action = (
        <a
          className={noStyles ? "" : styles.link}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          data-text={noStyles ? "" : children}
        >
          {children}
        </a>
      );
    }
  } else {
    if (noAction) {
      action = (
        <span
          className={noStyles ? "" : styles.link}
          data-text={noStyles ? "" : children}
        >
          {children}
        </span>
      );
    } else {
      action = (
        <button
          type="button"
          className={noStyles ? "" : styles.link}
          data-text={noStyles ? "" : children}
        >
          {children}
        </button>
      );
    }
  }

  if (src) {
    content = (
      <a href={href} target="_blank" rel="noreferrer noopener">
        <Image src={src} alt={alt || "image"} width={320} height={240} />
      </a>
    );
  }

  if (srcs) {
    content = (
      <span className={styles.multiTooltip}>
        {srcs.map(({ href, src, alt }) => (
          <a key={href} href={href} target="_blank" rel="noreferrer noopener">
            <Image src={src} alt={alt} width={320} height={240} />
          </a>
        ))}
      </span>
    );
  }

  if (!content) {
    return action;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{action}</TooltipTrigger>
      <TooltipContent side="top" align="center">
        {content}
      </TooltipContent>
    </Tooltip>
  );
};
