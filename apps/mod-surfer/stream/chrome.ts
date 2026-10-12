// The installed Google Chrome, run headless on the world's page. Spawned
// directly rather than through a driver: the page needs only to load and
// run, and the mod then ships with no dependencies.

import path from "node:path";

type Env = Readonly<Record<string, string | undefined>>;

// Where Chrome installs itself; `CHROME_PATH` names any other.
export const chromePaths = (platform: NodeJS.Platform, env: Env): string[] => {
  if (env.CHROME_PATH) {
    return [env.CHROME_PATH];
  }
  if (platform === "darwin") {
    return ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"];
  }
  if (platform === "win32") {
    return [env.LOCALAPPDATA, env.PROGRAMFILES, env["PROGRAMFILES(X86)"]].flatMap((base) =>
      base ? [path.win32.join(base, "Google", "Chrome", "Application", "chrome.exe")] : [],
    );
  }
  return ["/opt/google/chrome/chrome", "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable"];
};

// A throwaway profile, so it never touches the user's own, and no throttling:
// a headless page counts as hidden, and a hidden page's frames slow to a crawl.
// The debugging pipe (fds 3 and 4) is never spoken on: Chrome exits when it
// closes, so a streamer killed outright still takes Chrome with it.
export const chromeArgs = (profileDir: string, url: string) => [
  "--headless",
  "--remote-debugging-pipe",
  `--user-data-dir=${profileDir}`,
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-background-networking",
  "--disable-background-timer-throttling",
  "--disable-backgrounding-occluded-windows",
  "--disable-renderer-backgrounding",
  "--disable-component-update",
  "--disable-extensions",
  "--disable-sync",
  "--mute-audio",
  "--password-store=basic",
  "--use-mock-keychain",
  url,
];
