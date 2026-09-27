// Builds the publishable npm packages for the CLI. Run with bun:
//   bun scripts/build.ts
//
// Output layout (everything under dist/npm/ is publish-ready):
//   dist/npm/cli-<os>-<cpu>/   @kyh/cli-<os>-<cpu> — bun-compiled standalone
//                              binary for one platform (os/cpu-gated on npm)
//   dist/npm/kyh/              kyh — Node launcher shim + exact-pinned
//                              optionalDependencies on the platform packages
//
// The platform packages embed the Bun runtime and opentui's native library,
// so end users need neither Bun nor a compatible Node FFI.
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

interface Target {
  os: "darwin" | "linux" | "win32";
  cpu: "x64" | "arm64";
  bunTarget: string;
}

// opentui also ships win32-arm64, but bun can't cross-compile to it yet.
// Linux targets are glibc; musl users are out of luck for now.
const targets: Target[] = [
  { bunTarget: "bun-darwin-arm64", cpu: "arm64", os: "darwin" },
  { bunTarget: "bun-darwin-x64", cpu: "x64", os: "darwin" },
  { bunTarget: "bun-linux-arm64", cpu: "arm64", os: "linux" },
  { bunTarget: "bun-linux-x64", cpu: "x64", os: "linux" },
  { bunTarget: "bun-windows-x64", cpu: "x64", os: "win32" },
];

const rootDir = path.join(import.meta.dirname, "..");
const outDir = path.join(rootDir, "dist", "npm");

interface CliManifest {
  version: string;
  description: string;
}

// SAFETY: apps/cli/package.json is workspace-owned; npm itself rejects a non-string
// `version`, and `description` is maintained alongside it. The emptiness check below
// still fails the build loudly if either field goes missing.
const manifest = JSON.parse(
  readFileSync(path.join(rootDir, "package.json"), "utf-8"),
) as CliManifest;
const { version, description } = manifest;
if (!version || !description) {
  throw new Error("apps/cli/package.json is missing a version/description");
}

rmSync(outDir, { force: true, recursive: true });

const platformPackageName = (target: Target) => `@kyh/cli-${target.os}-${target.cpu}`;

for (const target of targets) {
  const packageDir = path.join(outDir, `cli-${target.os}-${target.cpu}`);
  const binName = target.os === "win32" ? "kyh.exe" : "kyh";
  mkdirSync(path.join(packageDir, "bin"), { recursive: true });

  const result = spawnSync(
    "bun",
    [
      "build",
      "--compile",
      `--target=${target.bunTarget}`,
      path.join(rootDir, "src", "index.tsx"),
      "--outfile",
      path.join(packageDir, "bin", binName),
    ],
    { cwd: rootDir, stdio: "inherit" },
  );
  if (result.status !== 0) {
    throw new Error(`bun build failed for ${target.bunTarget}`);
  }

  writeFileSync(
    path.join(packageDir, "package.json"),
    JSON.stringify(
      {
        cpu: [target.cpu],
        description: `${description} (${target.os}-${target.cpu} binary)`,
        files: ["bin"],
        name: platformPackageName(target),
        os: [target.os],
        publishConfig: { access: "public" },
        version,
      },
      null,
      2,
    ),
  );
}

const mainDir = path.join(outDir, "kyh");
mkdirSync(path.join(mainDir, "bin"), { recursive: true });
copyFileSync(path.join(rootDir, "bin", "kyh.cjs"), path.join(mainDir, "bin", "kyh.cjs"));
copyFileSync(path.join(rootDir, "README.md"), path.join(mainDir, "README.md"));

writeFileSync(
  path.join(mainDir, "package.json"),
  JSON.stringify(
    {
      bin: { kyh: "./bin/kyh.cjs" },
      description,
      engines: { node: ">=18" },
      files: ["bin"],
      name: "kyh",
      optionalDependencies: Object.fromEntries(
        targets.map((target) => [platformPackageName(target), version]),
      ),
      publishConfig: { access: "public" },
      version,
    },
    null,
    2,
  ),
);

console.log(`Staged ${targets.length + 1} packages in ${outDir} (version ${version})`);
