"use client";

import Image from "next/image";
import NextLink from "next/link";

import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

interface LinkProps {
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
}

interface ActionProps {
  children: React.ReactNode;
  className: string;
  dataText: React.ReactNode;
  href?: string;
  noAction: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const actionOf = ({
  children,
  className,
  dataText,
  href,
  noAction,
  onMouseEnter,
  onMouseLeave,
}: ActionProps) => {
  const hover = { onBlur: onMouseLeave, onFocus: onMouseEnter, onMouseEnter, onMouseLeave };

  if (href === undefined || href === "") {
    return noAction ? (
      <span className={className} data-text={dataText}>
        {children}
      </span>
    ) : (
      <button type="button" className={className} data-text={dataText} {...hover}>
        {children}
      </button>
    );
  }

  if (href.startsWith("/")) {
    return (
      <NextLink className={className} href={href} data-text={dataText} {...hover}>
        {children}
      </NextLink>
    );
  }

  const external = href.startsWith("#") ? {} : { rel: "noopener noreferrer", target: "_blank" };

  return (
    <a className={className} href={href} data-text={dataText} {...external} {...hover}>
      {children}
    </a>
  );
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

  const action = actionOf({
    children,
    className: noStyles ? "" : `link ${active === true ? "active" : ""}`,
    dataText: noStyles ? "" : children,
    href,
    noAction,
    onMouseEnter,
    onMouseLeave,
  });

  if (src !== undefined && src !== "") {
    const isRelativeUrl = (href?.startsWith("/") ?? false) || (href?.startsWith("#") ?? false);
    content = (
      <a href={href} {...(isRelativeUrl ? {} : { rel: "noreferrer noopener", target: "_blank" })}>
        <Image src={src} alt={alt ?? "image"} width={320} height={240} />
      </a>
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
