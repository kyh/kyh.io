#!/usr/bin/env node
// Launcher for the published `kyh` package. The real CLI is a bun-compiled
// standalone binary shipped in a platform-specific optional dependency;
// this shim only locates and execs it, so end users need Node but not Bun.
"use strict";

const { spawnSync } = require("node:child_process");

const packageName = `@kyh/cli-${process.platform}-${process.arch}`;
const binName = process.platform === "win32" ? "kyh.exe" : "kyh";

let binPath;
try {
  binPath = require.resolve(`${packageName}/bin/${binName}`);
} catch {
  console.error(
    [
      `kyh: no prebuilt binary for ${process.platform}-${process.arch}.`,
      `Expected the optional dependency "${packageName}" to be installed.`,
      `If you installed with --no-optional/--omit=optional, reinstall without it.`,
      `Otherwise this platform isn't supported yet — file an issue at https://github.com/kyh/kyh.io/issues.`,
    ].join("\n"),
  );
  process.exit(1);
}

const result = spawnSync(binPath, process.argv.slice(2), { stdio: "inherit" });
if (result.error) {
  console.error(`kyh: failed to launch binary: ${result.error.message}`);
  process.exit(1);
}
if (result.signal) {
  process.kill(process.pid, result.signal);
}
process.exit(result.status === null ? 1 : result.status);
