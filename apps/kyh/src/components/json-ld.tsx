import {
  buildStructuredData,
  buildVideoObject,
  serializeStructuredData,
} from "@/lib/structured-data";
import { todaysVideo } from "@/lib/todays-video";

const structuredData = serializeStructuredData(buildStructuredData());

export const JsonLd = () => <script type="application/ld+json">{structuredData}</script>;

/** Today's clip's `VideoObject`, on every page, as every page carries it as `og:video`. */
export const VideoJsonLd = async () => {
  const videoObject = serializeStructuredData(buildVideoObject(await todaysVideo()));

  return <script type="application/ld+json">{videoObject}</script>;
};
