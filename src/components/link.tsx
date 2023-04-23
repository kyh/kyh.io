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
  const actionClassName = noStyles ? "" : styles.link;
  const actionDataText = noStyles ? "" : children;

  if (href) {
    if (href.startsWith("/")) {
      action = (
        <NextLink
          className={actionClassName}
          href={href}
          data-text={actionDataText}
        >
          {children}
        </NextLink>
      );
    } else {
      action = (
        <a
          className={actionClassName}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          data-text={actionDataText}
        >
          {children}
        </a>
      );
    }
  } else {
    if (noAction) {
      action = (
        <span className={actionClassName} data-text={actionDataText}>
          {children}
        </span>
      );
    } else {
      action = (
        <button
          type="button"
          className={actionClassName}
          data-text={actionDataText}
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