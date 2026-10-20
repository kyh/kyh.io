import { seasonScript } from "./script";

const script = seasonScript();

/** Tints the page for the calendar's season before it paints (src/seasons/script.ts). */
export const SeasonScript = () => (
  // oxlint-disable-next-line react/no-danger -- an inline script must run before first paint; its body is built from numbers and the seasons' own ids, so nothing in it can close the tag
  <script dangerouslySetInnerHTML={{ __html: script }} />
);
