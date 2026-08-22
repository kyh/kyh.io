const CODE_SPAN = /(`[^`]+`)/g;

/**
 * Renders the one piece of inline markup `page-content.ts` allows: backtick code
 * spans. Everything else stays plain text, which keeps the markdown and HTML
 * renderings of a page trivially equivalent.
 */
export const ProseText = ({ text }: { text: string }) => (
  <>
    {text.split(CODE_SPAN).map((part) =>
      part.startsWith("`") && part.endsWith("`") ? (
        <code
          key={part}
          className="bg-background-hover rounded px-1 py-0.5 font-mono text-[0.85em]"
        >
          {part.slice(1, -1)}
        </code>
      ) : (
        part
      ),
    )}
  </>
);
