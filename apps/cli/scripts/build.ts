// Builds the publishable npm packages for the CLI. Run with bun:
//   bun scripts/build.ts
//
// Output layout (everything under dist/npm/ is publish-ready):
//   dist/npm/cli-<os>-<cpu>[-musl]/   @kyh/cli-<os>-<cpu>[-musl] — bun-compiled
//                              standalone binary for one platform (os/cpu/libc-gated on npm)
//   dist/npm/kyh/              kyh — Node launcher shim + exact-pinned
//                              optionalDependencies on the platform packages
//
// The platform packages embed the Bun runtime and opentui's native library,
// so end users need neither Bun nor a compatible Node FFI. Alpine needs
// `apk add libstdc++`, as every Bun binary there does.
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

interface Target {
  os: "darwin" | "linux" | "win32";
  cpu: "x64" | "arm64";
  /** Linux only: the C library the binary links. */
  libc?: "glibc" | "musl";
  bunTarget: Bun.Build.CompileTarget;
}

// opentui also ships win32-arm64, but bun can't cross-compile to it yet.
const targets: Target[] = [
  { bunTarget: "bun-darwin-arm64", cpu: "arm64", os: "darwin" },
  { bunTarget: "bun-darwin-x64", cpu: "x64", os: "darwin" },
  { bunTarget: "bun-linux-arm64", cpu: "arm64", libc: "glibc", os: "linux" },
  { bunTarget: "bun-linux-x64", cpu: "x64", libc: "glibc", os: "linux" },
  { bunTarget: "bun-linux-arm64-musl", cpu: "arm64", libc: "musl", os: "linux" },
  { bunTarget: "bun-linux-x64-musl", cpu: "x64", libc: "musl", os: "linux" },
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

const run = (command: string, args: string[]) => {
  const result = spawnSync(command, args, { cwd: rootDir, stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed`);
  }
};

// SAFETY: opentui's own package.json; npm rejects a package without a string `version`.
const opentuiVersion = (
  JSON.parse(
    readFileSync(createRequire(import.meta.url).resolve("@opentui/core/package.json"), "utf-8"),
  ) as { version: string }
).version;

/**
 * opentui loads its native library from a per-platform package. pnpm installs
 * the glibc and macOS/Windows ones (`supportedArchitectures`); the musl ones
 * are fetched here, at the installed opentui's exact version, since only this
 * build reads them and installing them for every checkout costs hundreds of MB.
 */
const muslNativePackage = (cpu: Target["cpu"]): string => {
  const name = `core-linux-${cpu}-musl`;
  const dir = path.join(rootDir, ".cache", "opentui", `${name}-${opentuiVersion}`);
  if (!existsSync(path.join(dir, "package", "index.bun.js"))) {
    rmSync(dir, { force: true, recursive: true });
    mkdirSync(dir, { recursive: true });
    run("npm", ["pack", `@opentui/${name}@${opentuiVersion}`, "--pack-destination", dir]);
    run("tar", ["xzf", path.join(dir, `opentui-${name}-${opentuiVersion}.tgz`), "-C", dir]);
  }
  return path.join(dir, "package");
};

/**
 * opentui picks its Linux native library by OPENTUI_LIBC at runtime, and
 * imports both libcs' packages by name. Fixing the variable at compile time
 * folds the other libc's import away, so bun embeds one library and needs only
 * that package; a musl build resolves musl's from the fetched copy.
 */
const linuxBuild = (target: Target) => {
  const define = { "process.env.OPENTUI_LIBC": JSON.stringify(target.libc) };
  if (target.libc !== "musl") {
    return { define, plugins: [] };
  }
  const nativePackage = muslNativePackage(target.cpu);
  const plugin: Bun.BunPlugin = {
    name: "opentui-musl-native",
    setup: (build) => {
      build.onResolve({ filter: /^@opentui\/core-linux-(?:x64|arm64)-musl$/u }, () => ({
        path: path.join(nativePackage, "index.bun.js"),
      }));
    },
  };
  return { define, plugins: [plugin] };
};

rmSync(outDir, { force: true, recursive: true });

const platformSuffix = (target: Target) =>
  `${target.os}-${target.cpu}${target.libc === "musl" ? "-musl" : ""}`;

const platformPackageName = (target: Target) => `@kyh/cli-${platformSuffix(target)}`;

for (const target of targets) {
  const packageDir = path.join(outDir, `cli-${platformSuffix(target)}`);
  const binName = target.os === "win32" ? "kyh.exe" : "kyh";
  mkdirSync(path.join(packageDir, "bin"), { recursive: true });

  const linux = target.os === "linux" ? linuxBuild(target) : undefined;
  const result = await Bun.build({
    compile: { outfile: path.join(packageDir, "bin", binName), target: target.bunTarget },
    define: linux?.define,
    entrypoints: [path.join(rootDir, "src", "index.tsx")],
    plugins: linux?.plugins,
  });
  if (!result.success) {
    throw new AggregateError(result.logs, `bun build failed for ${target.bunTarget}`);
  }

  writeFileSync(
    path.join(packageDir, "package.json"),
    JSON.stringify(
      {
        cpu: [target.cpu],
        description: `${description} (${platformSuffix(target)} binary)`,
        files: ["bin"],
        // npm installs a libc-gated package only where that libc runs.
        libc: target.libc ? [target.libc] : undefined,
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
