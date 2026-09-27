/**
 * Content negotiation for the two representations this site serves.
 *
 * Browsers and crawlers send `Accept: text/html,...`; bare tooling (`curl`,
 * most fetch defaults) sends a wildcard Accept, or none at all. HTML is only the
 * right default for the first group, so we serve markdown unless HTML was asked
 * for by name. Every response built on this must send `Vary: Accept`.
 */
const HTML_TYPES = ["text/html", "application/xhtml+xml"];

export const acceptsMarkdown = (accept: string | null) =>
  (accept ?? "").toLowerCase().includes("text/markdown");

export const acceptsHtml = (accept: string | null) => {
  const value = (accept ?? "").toLowerCase();
  return HTML_TYPES.some((type) => value.includes(type));
};

/** True when the client explicitly asked for HTML; markdown otherwise. */
export const prefersHtml = (accept: string | null) =>
  acceptsHtml(accept) && !acceptsMarkdown(accept);
