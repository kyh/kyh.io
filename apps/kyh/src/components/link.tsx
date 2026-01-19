"use client";

import Image from "next/image";
import NextLink from "next/link";

import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

type LinkProps = {
  children: React.ReactNode;
  href?: string;
  noStyles?: boolean;
  noAction?: boolean;
  alt?: string;
  src?: string;
  open?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  active?: boolean;
};

export const Link = ({
  children,
  href,
  src,
  alt,
  open,
  noStyles = false,
  noAction = false,
  onMouseEnter,
  onMouseLeave,
  active,
}: LinkProps) => {
  let content: React.ReactNode = null;
  let action: React.ReactNode = null;
  const actionClassName = noStyles ? "" : `link ${active ? "active" : ""}`;
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
          onFocus={onMouseEnter}
          onBlur={onMouseLeave}
        >
          {children}
        </NextLink>
      );
    } else if (href.startsWith("#")) {
      action = (
        <a
          className={actionClassName}
          href={href}
          data-text={actionDataText}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onFocus={onMouseEnter}
          onBlur={onMouseLeave}
        >
          {children}
        </a>
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
          onFocus={onMouseEnter}
          onBlur={onMouseLeave}
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
          onFocus={onMouseEnter}
          onBlur={onMouseLeave}
        >
          {children}
        </button>
      );
    }
  }

  if (src) {
    const isRelativeUrl =
      (href?.startsWith("/") ?? false) || (href?.startsWith("#") ?? false);
    content = (
      <a
        href={href}
        {...(isRelativeUrl
          ? {}
          : { target: "_blank", rel: "noreferrer noopener" })}
      >
        <Image src={src} alt={alt ?? "image"} width={320} height={240} />
      </a>
    );
  }

  if (!content) {
    return action;
  }

  return (
    <Tooltip open={open}>
      <TooltipTrigger render={action} />
      <TooltipContent type="block">{content}</TooltipContent>
    </Tooltip>
  );
};
