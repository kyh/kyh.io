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
import { join } from "node:path";

type Target = {
  os: "darwin" | "linux" | "win32";
  cpu: "x64" | "arm64";
  bunTarget: string;
};

// opentui also ships win32-arm64, but bun can't cross-compile to it yet.
// Linux targets are glibc; musl users are out of luck for now.
const targets: Target[] = [
  { os: "darwin", cpu: "arm64", bunTarget: "bun-darwin-arm64" },
  { os: "darwin", cpu: "x64", bunTarget: "bun-darwin-x64" },
  { os: "linux", cpu: "arm64", bunTarget: "bun-linux-arm64" },
  { os: "linux", cpu: "x64", bunTarget: "bun-linux-x64" },
  { os: "win32", cpu: "x64", bunTarget: "bun-windows-x64" },
];

const rootDir = join(import.meta.dirname, "..");
const outDir = join(rootDir, "dist", "npm");

const manifest: unknown = JSON.parse(readFileSync(join(rootDir, "package.json"), "utf8"));
if (
  typeof manifest !== "object" ||
  manifest === null ||
  !("version" in manifest) ||
  typeof manifest.version !== "string" ||
  !("description" in manifest) ||
  typeof manifest.description !== "string"
) {
  throw new Error("apps/cli/package.json is missing a string version/description");
}
const { version, description } = manifest;

rmSync(outDir, { recursive: true, force: true });

const platformPackageName = (target: Target) => `@kyh/cli-${target.os}-${target.cpu}`;

for (const target of targets) {
  const packageDir = join(outDir, `cli-${target.os}-${target.cpu}`);
  const binName = target.os === "win32" ? "kyh.exe" : "kyh";
  mkdirSync(join(packageDir, "bin"), { recursive: true });

  const result = spawnSync(
    "bun",
    [
      "build",
      "--compile",
      `--target=${target.bunTarget}`,
      join(rootDir, "src", "index.tsx"),
      "--outfile",
      join(packageDir, "bin", binName),
    ],
    { stdio: "inherit", cwd: rootDir },
  );
  if (result.status !== 0) {
    throw new Error(`bun build failed for ${target.bunTarget}`);
  }

  writeFileSync(
    join(packageDir, "package.json"),
    JSON.stringify(
      {
        name: platformPackageName(target),
        version,
        description: `${description} (${target.os}-${target.cpu} binary)`,
        os: [target.os],
        cpu: [target.cpu],
        files: ["bin"],
        publishConfig: { access: "public" },
      },
      null,
      2,
    ),
  );
}

const mainDir = join(outDir, "kyh");
mkdirSync(join(mainDir, "bin"), { recursive: true });
copyFileSync(join(rootDir, "bin", "kyh.cjs"), join(mainDir, "bin", "kyh.cjs"));
copyFileSync(join(rootDir, "README.md"), join(mainDir, "README.md"));

writeFileSync(
  join(mainDir, "package.json"),
  JSON.stringify(
    {
      name: "kyh",
      version,
      description,
      bin: { kyh: "./bin/kyh.cjs" },
      files: ["bin"],
      engines: { node: ">=18" },
      publishConfig: { access: "public" },
      optionalDependencies: Object.fromEntries(
        targets.map((target) => [platformPackageName(target), version]),
      ),
    },
    null,
    2,
  ),
);

console.log(`Staged ${targets.length + 1} packages in ${outDir} (version ${version})`);
