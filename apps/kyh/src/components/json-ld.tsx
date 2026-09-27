import { buildStructuredData, serializeStructuredData } from "@/lib/structured-data";

const structuredData = serializeStructuredData(buildStructuredData());

export const JsonLd = () => (
  // oxlint-disable-next-line react/no-danger -- the only way to emit a JSON-LD script body; serializeStructuredData escapes `<`, so no value can close the tag early
  <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />
);
