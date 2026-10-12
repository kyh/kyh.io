import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { chromeArgs, chromePaths } from "../stream/chrome";
import { assetPath, contentType } from "../stream/files";

describe("chrome", () => {
  it("finds Chrome where each platform installs it", () => {
    assert.deepEqual(chromePaths("darwin", {}), [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    ]);
    assert.ok(chromePaths("linux", {}).includes("/opt/google/chrome/chrome"));
    assert.deepEqual(chromePaths("win32", { LOCALAPPDATA: "C:\\Users\\k\\AppData\\Local" }), [
      "C:\\Users\\k\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe",
    ]);
  });

  it("takes CHROME_PATH over the defaults", () => {
    assert.deepEqual(chromePaths("darwin", { CHROME_PATH: "/opt/chromium" }), ["/opt/chromium"]);
  });

  it("runs headless on a throwaway profile, the page last", () => {
    const args = chromeArgs("/tmp/profile", "http://127.0.0.1:1/?stream");
    assert.ok(args.includes("--headless"));
    assert.ok(args.includes("--user-data-dir=/tmp/profile"));
    assert.equal(args.at(-1), "http://127.0.0.1:1/?stream");
  });
});

describe("world files", () => {
  it("serves the page at / and assets by path", () => {
    assert.equal(assetPath("/w", "/?stream"), "/w/index.html");
    assert.equal(assetPath("/w", "/assets/index-abc.js"), "/w/assets/index-abc.js");
    assert.equal(contentType("/w/assets/index-abc.js"), "text/javascript");
  });

  it("refuses paths that climb out of the world", () => {
    assert.equal(assetPath("/w", "/..%2f..%2fetc/passwd"), null);
    assert.equal(assetPath("/w", "/%2e%2e/secret"), "/w/secret");
  });
});
