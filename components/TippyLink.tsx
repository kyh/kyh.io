import Tippy from "@tippyjs/react";

type Props = {
  text: string;
  href: string;
  alt?: string;
  src?: string;
  srcs?: { href: string; src: string; alt: string }[];
};

export const TippyLink = ({ text, href, src, alt, srcs }: Props) => {
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
            <picture>
              <source srcSet={src} type="image/webp" />
              <source srcSet={src.replace(".webp", ".png")} type="image/png" />
              <img src={src} alt={alt} width="320" height="240" />
            </picture>
          </a>
        ))}
      </div>
    );
  }

  return (
    <Tippy
      interactive
      maxWidth="none"
      animation="shift-away-subtle"
      content={content}
    >
      <a
        className="link"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        data-text={text}
      >
        {text}
      </a>
    </Tippy>
  );
};
