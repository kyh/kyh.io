import path from "node:path";

type Env = Readonly<Record<string, string | undefined>>;

export const chromePaths = (platform: NodeJS.Platform, env: Env) => {
  if (env.CHROME_PATH !== undefined && env.CHROME_PATH !== "") {
    return [env.CHROME_PATH] satisfies string[];
  }

  if (platform === "darwin") {
    return ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"] satisfies string[];
  }

  if (platform === "win32") {
    return [env.LOCALAPPDATA, env.PROGRAMFILES, env["PROGRAMFILES(X86)"]].flatMap((base) =>
      base !== undefined && base !== ""
        ? [path.win32.join(base, "Google", "Chrome", "Application", "chrome.exe")]
        : [],
    ) satisfies string[];
  }

  return [
    "/opt/google/chrome/chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
  ] satisfies string[];
};

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
