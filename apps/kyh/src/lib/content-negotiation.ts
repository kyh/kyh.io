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
