import { absoluteUrl } from "@/lib/config";
import type { ContentLink, PageContent } from "@/lib/page-content";

/**
 * A prose page flattened into markdown's own block structure. `renderPageMarkdown`
 * serialises it and `MarkdownPage` renders it as HTML, so both representations are
 * the same sequence of blocks and can't drift.
 */
export type DocumentBlock =
  | { kind: "heading"; level: 1 | 2 | 3; text: string; id?: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: ContentLink[] }
  | { kind: "rule" }
  | { kind: "canonical"; url: string };

export const buildPageDocument = (page: PageContent): DocumentBlock[] => [
  { kind: "heading", level: 1, text: page.heading },
  ...page.intro.map((text): DocumentBlock => ({ kind: "paragraph", text })),
  ...page.sections.flatMap((section): DocumentBlock[] => [
    { id: section.id, kind: "heading", level: 2, text: section.heading },
    ...section.blocks.map((block): DocumentBlock => {
      if (block.kind === "subheading") {
        return { kind: "heading", level: 3, text: block.text };
      }
      if (block.kind === "links") {
        return { items: block.items, kind: "list" };
      }
      return { kind: "paragraph", text: block.text };
    }),
  ]),
  { kind: "rule" },
  { kind: "canonical", url: absoluteUrl(page.path) },
];
