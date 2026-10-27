import {
  buildStructuredData,
  buildVideoObject,
  serializeStructuredData,
} from "@/lib/structured-data";
import { todaysVideo } from "@/lib/todays-video";

const structuredData = serializeStructuredData(buildStructuredData());

export const JsonLd = () => (
  // oxlint-disable-next-line react/no-danger -- the only way to emit a JSON-LD script body; serializeStructuredData escapes `<`, so no value can close the tag early
  <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />
);

/** Today's clip's `VideoObject`, on every page, as every page carries it as `og:video`. */
export const VideoJsonLd = async () => {
  const videoObject = serializeStructuredData(buildVideoObject(await todaysVideo()));
  return (
    // oxlint-disable-next-line react/no-danger -- as above: escaped JSON-LD
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: videoObject }} />
  );
};
