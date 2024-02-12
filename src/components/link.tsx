"use client";

import Image from "next/image";
import NextLink from "next/link";

import styles from "./link.module.css";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

type LinkProps = {
  children: React.ReactNode;
  href?: string;
  noStyles?: boolean;
  noAction?: boolean;
  alt?: string;
  src?: string;
  srcs?: { href: string; src: string; alt: string }[];
  open?: boolean;
};

export const Link = ({
  children,
  href,
  src,
  alt,
  srcs,
  open,
  noStyles = false,
  noAction = false,
}: LinkProps) => {
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
        <Image src={src} alt={alt ?? "image"} width={320} height={240} />
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
    <Tooltip open={open}>
      <TooltipTrigger asChild>{action}</TooltipTrigger>
      <TooltipContent showLines>{content}</TooltipContent>
    </Tooltip>
  );
};
