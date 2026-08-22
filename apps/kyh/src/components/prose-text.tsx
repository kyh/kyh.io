const CODE_SPAN = /(`[^`]+`)/g;

/**
 * Code spans are the only inline markup `page-content.ts` allows, so the markdown
 * and HTML renderings of a page stay trivially equivalent.
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
