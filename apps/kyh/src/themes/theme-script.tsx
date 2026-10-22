import { themeScript } from "./script";

const script = themeScript();

/** Paints the page in the calendar's theme before it paints (src/themes/script.ts). */
export const ThemeScript = () => (
  // oxlint-disable-next-line react/no-danger -- an inline script must run before first paint; its body is built from numbers and the themes' own ids, so nothing in it can close the tag
  <script dangerouslySetInnerHTML={{ __html: script }} />
);
