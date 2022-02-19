import Tippy from "@tippyjs/react";
import { Image } from "./Image";
import styles from "./Link.module.css";

type Props = {
  href: string;
  children: React.ReactNode;
  noStyles?: boolean;
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
}: Props) => {
  const link = (
    <a
      className={noStyles ? "" : styles.link}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-text={children}
    >
      {children}
    </a>
  );

  let content = null;

  if (src) {
    content = (
      <a href={href} target="_blank" rel="noreferrer noopener">
        <picture>
          <source srcSet={src} type="image/webp" />
          <source srcSet={src.replace(".webp", ".png")} type="image/png" />
          <img src={src} alt={alt} width="320" height="240" />
        </picture>
      </a>
    );
  }

  if (srcs) {
    content = (
      <div className="tooltip-multi">
        {srcs.map(({ href, src, alt }) => (
          <a key={href} href={href} target="_blank" rel="noreferrer noopener">
            <Image src={src} alt={alt} width={320} height={240} />
          </a>
        ))}
      </div>
    );
  }

  if (content) {
    return (
      <Tippy
        interactive
        maxWidth="none"
        animation="shift-away-subtle"
        content={content}
        appendTo={typeof document !== "undefined" ? document.body : "parent"}
      >
        {link}
      </Tippy>
    );
  }

  return link;
};
