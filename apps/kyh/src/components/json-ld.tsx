import {
  buildStructuredData,
  buildVideoObject,
  serializeStructuredData,
} from "@/lib/structured-data";

const structuredData = serializeStructuredData(buildStructuredData());
const videoObject = serializeStructuredData(buildVideoObject());

export const JsonLd = () => (
  // oxlint-disable-next-line react/no-danger -- the only way to emit a JSON-LD script body; serializeStructuredData escapes `<`, so no value can close the tag early
  <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />
);

/** The showcase clip's `VideoObject`, on the pages that carry it as `og:video`. */
export const VideoJsonLd = () => (
  // oxlint-disable-next-line react/no-danger -- as above: escaped JSON-LD
  <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: videoObject }} />
);
