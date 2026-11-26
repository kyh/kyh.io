import { themeScript } from "./script";

const script = themeScript();

/** Paints the page in the calendar's theme before it paints (src/themes/script.ts). */
export const ThemeScript = () => <script>{script}</script>;
