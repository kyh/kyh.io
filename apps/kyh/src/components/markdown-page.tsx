import NextLink from "next/link";

import { ProseText } from "@/components/prose-text";
import type { ContentLink, PageContent } from "@/lib/page-content";
import type { DocumentBlock } from "@/lib/page-document";
import { buildPageDocument } from "@/lib/page-document";

const linkClassName =
  "text-foreground-highlighted decoration-foreground-faded hover:decoration-foreground-highlighted underline underline-offset-4 transition-[text-decoration-color] duration-150";

const DocumentLink = ({ href, children }: { href: string; children: string }) =>
  href.startsWith("/") ? (
    <NextLink href={href} className={linkClassName}>
      {children}
    </NextLink>
  ) : (
    <a href={href} target="_blank" rel="noopener noreferrer" className={linkClassName}>
      {children}
    </a>
  );

const ListItem = ({ link }: { link: ContentLink }) => (
  <li>
    <DocumentLink href={link.href}>{link.label}</DocumentLink>:{" "}
    <ProseText text={link.description} />
  </li>
);

const Block = ({ block }: { block: DocumentBlock }) => {
  switch (block.kind) {
    case "heading": {
      if (block.level === 1) {
        return (
          <h1 className="text-foreground-highlighted text-lg leading-none font-medium">
            {block.text}
          </h1>
        );
      }
      if (block.level === 2) {
        return (
          <h2
            id={block.id}
            className="text-foreground-highlighted mt-4 scroll-mt-[120px] leading-none font-medium sm:scroll-mt-[100px]"
          >
            {block.text}
          </h2>
        );
      }
      return (
        <h3 className="text-foreground-highlighted text-sm leading-none font-medium">
          {block.text}
        </h3>
      );
    }
    case "paragraph": {
      return (
        <p>
          <ProseText text={block.text} />
        </p>
      );
    }
    case "list": {
      return (
        <ul className="marker:text-foreground-faded list-disc pl-5">
          {block.items.map((item) => (
            <ListItem key={item.href} link={item} />
          ))}
        </ul>
      );
    }
    // The canonical footer orients agents reading bare markdown; in HTML the
    // `<link rel="canonical">` already carries it.
    case "rule":
    case "canonical": {
      return null;
    }
    default: {
      return block satisfies never;
    }
  }
};

/** Paired with `renderPageMarkdown`, which serialises the same document as markdown. */
export const MarkdownPage = ({ content }: { content: PageContent }) => (
  <div className="relative isolate min-h-screen px-6 pt-30 pb-64">
    <main className="text-foreground relative z-10 mx-auto flex w-full flex-col gap-4 sm:w-[560px]">
      {buildPageDocument(content).map((block, index) => (
        <Block key={`${block.kind}-${index}`} block={block} />
      ))}
    </main>
  </div>
);
