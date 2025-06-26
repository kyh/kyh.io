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
  srcs?: {
    src: string;
    type?: "image" | "video";
    href?: string;
    alt?: string;
  }[];
  aspectRatio?: "16:9" | "4:3";
  open?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
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
  aspectRatio = "4:3",
  onMouseEnter,
  onMouseLeave,
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
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
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
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
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
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
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
      <span
        className={`${styles.multiTooltip} ${aspectRatio === "16:9" ? styles.aspectRatio169 : ""}`}
      >
        {srcs.map(({ type, href, src, alt }) => (
          <a key={href} href={href} target="_blank" rel="noreferrer noopener">
            {type === "video" ? (
              <video autoPlay muted loop>
                <source src={src} type="video/webm" />
                Unsupported.
              </video>
            ) : (
              <Image src={src} alt={alt ?? "image"} width={320} height={240} />
            )}
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
      <TooltipContent type="block">{content}</TooltipContent>
    </Tooltip>
  );
};
