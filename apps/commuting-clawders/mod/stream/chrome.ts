import path from "node:path";

type Env = Readonly<Record<string, string | undefined>>;

export const chromePaths = (platform: NodeJS.Platform, env: Env) => {
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
