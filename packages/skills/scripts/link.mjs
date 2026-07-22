#!/usr/bin/env node
// Links this package into the agent ecosystem, the same way `npx skills` does:
//
//   1. Canonical store at ~/.agents — skills/<name> and agents/<name>.md are
//      symlinked here from the package. "Universal" agents (codex, amp, opencode,
//      goose, kimi) read ~/.agents directly, so they need nothing further.
//   2. Non-universal agents (claude) get their own dirs symlinked to the canonical
//      store: ~/.claude/skills/<name> -> ~/.agents/skills/<name>, etc.
//   3. CLAUDE.md -> ~/.claude/CLAUDE.md and mcp.json merged into ~/.claude.json.
//   4. External skill repos in external-skills.json are installed globally with
//      the bundled `skills` CLI (falls back to `npx skills`), all in parallel by
//      default (throttle with KYH_SKILLS_CONCURRENCY; skip with
//      KYH_SKILLS_NO_EXTERNAL=1).
//
// Runs on `postinstall`. Idempotent, non-destructive (real files are backed up,
// never deleted), falls back to copying when symlinks aren't permitted, and never
// throws — a failed link must not break `npm install`.
//
// During postinstall, only links for a global install (`npm i -g`); local/hoisted
// dependency installs are skipped. Run by hand or set KYH_SKILLS_FORCE=1 to link a
// working copy (also needed for yarn/pnpm global). Always skipped in CI; skip
// entirely with KYH_SKILLS_NO_LINK=1. Preview with --dry-run (KYH_SKILLS_DRY_RUN=1).

import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

const PKG_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOME = os.homedir();
const AGENTS_DIR = path.join(HOME, ".agents"); // canonical store (read directly by universal agents)
const CLAUDE_DIR = path.join(HOME, ".claude"); // non-universal: symlinks into the canonical store

const DRY = process.argv.includes("--dry-run") || !!process.env.KYH_SKILLS_DRY_RUN;
const FORCE = !!process.env.KYH_SKILLS_FORCE;
const TAG = "[@kyh/skills]";

const log = (...a) => console.log(TAG, ...a);
const warn = (...a) => console.warn(TAG, ...a);

async function main() {
  if (process.env.KYH_SKILLS_NO_LINK) return log("KYH_SKILLS_NO_LINK set — skipping.");
  if (process.env.CI) return log("CI detected — skipping link.");
  // A local or hoisted dependency install would aim the global symlinks at a
  // project's node_modules (which breaks when that tree moves or is cleared), so
  // during postinstall only link for an explicit global install. There's no
  // reliable cross-package-manager way to detect "global" from a path, and a
  // false link is worse than a false skip — so trust npm's npm_config_global and
  // bias to skipping. Running the script by hand (not a postinstall) or setting
  // KYH_SKILLS_FORCE=1 always links — use that for yarn/pnpm global installs,
  // which may not set npm_config_global.
  if (
    process.env.npm_lifecycle_event === "postinstall" &&
    process.env.npm_config_global !== "true" &&
    !FORCE
  )
    return log(
      "not a global install — skipping. Use `npm i -g`, or KYH_SKILLS_FORCE=1 to link this copy.",
    );
  if (process.platform === "win32")
    warn("Windows symlinks may need admin/developer mode; will fall back to copying.");
  if (DRY) log("dry run — no changes will be written.");

  // Each phase is isolated: one failing phase must not skip the rest. (Target
  // dirs are created lazily by place(), so a mkdir failure can't abort everything.)
  await step(linkCanonical); // package -> ~/.agents
  await step(installExternalSkills); // npx skills add <repo> ... -> ~/.agents (parallel)
  await step(linkClaude); // mirror everything in ~/.agents -> ~/.claude (incl. external)
  await step(linkClaudeMd);
  await step(mergeMcp);

  log("done. Universal agents (codex, amp, opencode, goose, kimi) read ~/.agents directly.");
}

async function step(fn) {
  try {
    await fn();
  } catch (e) {
    warn(`${fn.name} failed: ${e?.message ?? e}`);
  }
}

// --- canonical store: package -> ~/.agents -------------------------------------

function linkCanonical() {
  forEachSkill((name, src) => place(src, path.join(AGENTS_DIR, "skills", name), "dir"));
  forEachAgent((name, src) => place(src, path.join(AGENTS_DIR, "agents", name), "file"));
}

// --- claude (non-universal): mirror the whole ~/.agents store -> ~/.claude ------
// Covers both this package's skills/agents and any installed by `npx skills add`.

function linkClaude() {
  mirror(path.join(AGENTS_DIR, "skills"), path.join(CLAUDE_DIR, "skills"), "dir");
  mirror(path.join(AGENTS_DIR, "agents"), path.join(CLAUDE_DIR, "agents"), "file");
}

function mirror(srcDir, destDir, type) {
  if (!fs.existsSync(srcDir)) return;
  // Entries are dirs/symlinks (skills) or .md files/symlinks (agents); skip dotfiles.
  for (const entry of fs.readdirSync(srcDir)) {
    if (entry.startsWith(".")) continue;
    if (type === "file" && !entry.endsWith(".md")) continue;
    place(path.join(srcDir, entry), path.join(destDir, entry), type);
  }
}

// --- global CLAUDE.md ----------------------------------------------------------

function linkClaudeMd() {
  const src = path.join(PKG_ROOT, "CLAUDE.md");
  if (fs.existsSync(src)) place(src, path.join(CLAUDE_DIR, "CLAUDE.md"), "file");
}

// --- MCP: merge into ~/.claude.json mcpServers ---------------------------------

function mergeMcp() {
  const src = path.join(PKG_ROOT, "mcp.json");
  if (!fs.existsSync(src)) return;

  let servers;
  try {
    servers = JSON.parse(fs.readFileSync(src, "utf8")).mcpServers || {};
  } catch (e) {
    return warn(`could not parse mcp.json: ${e.message}`);
  }
  const names = Object.keys(servers);
  if (names.length === 0) return;

  const dest = path.join(HOME, ".claude.json");
  let config = {};
  if (fs.existsSync(dest)) {
    try {
      config = JSON.parse(fs.readFileSync(dest, "utf8"));
    } catch (e) {
      return warn(`~/.claude.json is not valid JSON — skipping MCP merge (${e.message}).`);
    }
  }
  // Only add servers the user doesn't already have; never overwrite their
  // entries, so reinstalls don't reset local tweaks.
  const existing = config.mcpServers || {};
  const added = names.filter((n) => !(n in existing));
  if (added.length === 0) return;
  config.mcpServers = { ...servers, ...existing }; // existing entries win

  if (DRY) return log(`would add mcpServers to ~/.claude.json: ${added.join(", ")}`);
  fs.writeFileSync(dest, JSON.stringify(config, null, 2) + "\n");
  log(`added mcpServers to ~/.claude.json: ${added.join(", ")}`);
}

// --- external skills: `skills add <repo> -g -s '*' -y` -------------------------

// Path to the bundled `skills` CLI, or null to fall back to `npx skills`.
function skillsBin() {
  try {
    const pkgJson = require.resolve("skills/package.json");
    const { bin } = JSON.parse(fs.readFileSync(pkgJson, "utf8"));
    const rel = typeof bin === "string" ? bin : bin?.skills;
    if (rel) return path.join(path.dirname(pkgJson), rel);
  } catch {
    /* not installed (e.g. --ignore-scripts / odd layout) — use npx */
  }
  return null;
}

async function installExternalSkills() {
  if (process.env.KYH_SKILLS_NO_EXTERNAL)
    return log("KYH_SKILLS_NO_EXTERNAL set — skipping external skills.");

  const file = path.join(PKG_ROOT, "external-skills.json");
  if (!fs.existsSync(file)) return;

  let repos;
  try {
    repos = JSON.parse(fs.readFileSync(file, "utf8")).repos;
  } catch (e) {
    return warn(`could not parse external-skills.json: ${e.message}`);
  }
  if (!Array.isArray(repos)) return warn("external-skills.json: `repos` must be an array.");
  if (repos.length === 0) return;

  // Default: run every repo at once (they're network-bound git clones). Throttle
  // with KYH_SKILLS_CONCURRENCY (e.g. on a slow link, or to avoid concurrent
  // writes to the shared ~/.agents lock).
  const limit = Math.max(1, Number(process.env.KYH_SKILLS_CONCURRENCY) || repos.length);
  if (DRY)
    return log(`would install external skills (concurrency ${limit}) from: ${repos.join(", ")}`);

  const bin = skillsBin();
  if (!bin) {
    // Fallback path: warm npx's cache once so the parallel workers don't each
    // race to resolve/download the CLI.
    try {
      spawnSync("npx", ["-y", "skills", "--help"], {
        stdio: "ignore",
        shell: process.platform === "win32",
      });
    } catch {
      /* best-effort warm-up */
    }
  }

  log(`installing external skills from ${repos.length} repos (concurrency ${limit})…`);
  await pool(repos, limit, (repo) => addRepo(repo, bin));
}

// Installs one repo globally into the same ~/.agents canonical store. Uses the
// bundled CLI directly (no npx resolution) when available.
function addRepo(repo, bin) {
  const args = ["add", repo, "-g", "-s", "*", "-y"];
  const [cmd, argv, useShell] = bin
    ? [process.execPath, [bin, ...args], false]
    : ["npx", ["-y", "skills", ...args], process.platform === "win32"];
  return new Promise((resolve) => {
    const child = spawn(cmd, argv, {
      stdio: "ignore", // parallel output would interleave; we log per-repo status instead
      shell: useShell,
    });
    child.on("error", (e) => {
      warn(`skills add ${repo} failed: ${e.message}`);
      resolve();
    });
    child.on("close", (code) => {
      if (code === 0) log(`added skills from ${repo}`);
      else warn(`skills add ${repo} failed (exit ${code})`);
      resolve();
    });
  });
}

// Runs `fn` over `items` with at most `limit` in flight.
async function pool(items, limit, fn) {
  let i = 0;
  const worker = async () => {
    while (i < items.length) await fn(items[i++]);
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

// --- helpers -------------------------------------------------------------------

function forEachSkill(fn) {
  const src = path.join(PKG_ROOT, "skills");
  if (!fs.existsSync(src)) return;
  for (const name of dirents(src, "dir")) fn(name, path.join(src, name));
}

function forEachAgent(fn) {
  const src = path.join(PKG_ROOT, "agents");
  if (!fs.existsSync(src)) return;
  for (const name of dirents(src, "file").filter((f) => f.endsWith(".md")))
    fn(name, path.join(src, name));
}

// Symlink src -> dest, falling back to a copy when symlinks aren't permitted.
function place(src, dest, type) {
  const rel = dest.replace(HOME, "~");
  try {
    ensureDir(path.dirname(dest));
    if (isSymlink(dest)) {
      if (samePath(dest, src)) return; // already linked to the right place
      if (DRY) return log(`would relink ${rel}`);
      fs.unlinkSync(dest);
    } else if (fs.existsSync(dest)) {
      if (sameContent(src, dest)) {
        // A real copy whose content matches the source — a prior copy-mode
        // fallback, or drift. Prefer a symlink so future source edits propagate,
        // but only where symlinks work; otherwise the copy is already the correct
        // end state, so leave it (no churn, stays idempotent).
        if (!symlinksSupported()) return;
        if (DRY) return log(`would upgrade copy ${rel} -> symlink`);
        fs.rmSync(dest, { recursive: type === "dir", force: true });
        // fall through to the symlink attempt below
      } else {
        const bak = backupPath(dest);
        if (DRY) return log(`would back up ${rel} -> ${path.basename(bak)} and link`);
        fs.renameSync(dest, bak);
        warn(`backed up existing ${rel} -> ${path.basename(bak)}`);
      }
    } else if (DRY) {
      return log(`would link ${rel}`);
    }
    try {
      fs.symlinkSync(src, dest, symlinkType(type));
      log(`linked ${rel}`);
    } catch (e) {
      // Cross-device or unprivileged (e.g. Windows without developer mode): copy.
      fs.cpSync(src, dest, { recursive: type === "dir" });
      warn(`copied ${rel} (symlink failed: ${e.code ?? e.message})`);
    }
  } catch (e) {
    warn(`failed to place ${rel}: ${e.message}`);
  }
}

function symlinkType(type) {
  if (type !== "dir") return "file";
  return process.platform === "win32" ? "junction" : "dir";
}

// Whether this platform/privilege level can create symlinks — probed once. Used
// to decide whether to upgrade a content-identical copy to a symlink: on systems
// without symlink support (e.g. Windows sans developer mode) that upgrade would
// rm-and-re-copy the file every run, so we skip it and keep the matching copy.
let _symlinkSupport;
function symlinksSupported() {
  if (_symlinkSupport !== undefined) return _symlinkSupport;
  const probe = path.join(os.tmpdir(), `kyh-skills-symlink-probe-${process.pid}`);
  try {
    fs.symlinkSync(PKG_ROOT, probe, symlinkType("dir"));
    _symlinkSupport = true;
  } catch {
    _symlinkSupport = false;
  } finally {
    try {
      fs.rmSync(probe, { force: true }); // unlink the probe symlink, not its target
    } catch {
      /* nothing to clean up */
    }
  }
  return _symlinkSupport;
}

function ensureDir(p) {
  if (DRY || fs.existsSync(p)) return;
  fs.mkdirSync(p, { recursive: true });
}

function dirents(dir, kind) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => (kind === "dir" ? d.isDirectory() : d.isFile()))
    .map((d) => d.name);
}

function isSymlink(p) {
  try {
    return fs.lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

function samePath(a, b) {
  try {
    return fs.realpathSync(a) === fs.realpathSync(b);
  } catch {
    return false;
  }
}

// Deep content equality (follows symlinks), so a prior copy-mode fallback is
// recognized on re-runs instead of being re-backed-up and re-copied.
function sameContent(a, b) {
  try {
    const sa = fs.statSync(a);
    const sb = fs.statSync(b);
    if (sa.isFile() && sb.isFile())
      return sa.size === sb.size && fs.readFileSync(a).equals(fs.readFileSync(b));
    if (sa.isDirectory() && sb.isDirectory()) {
      const ea = fs.readdirSync(a);
      const eb = new Set(fs.readdirSync(b));
      return (
        ea.length === eb.size &&
        ea.every((n) => eb.has(n) && sameContent(path.join(a, n), path.join(b, n)))
      );
    }
    return false;
  } catch {
    return false;
  }
}

function backupPath(p) {
  let bak = `${p}.bak`;
  if (fs.existsSync(bak)) bak = `${p}.bak-${Date.now()}`;
  return bak;
}

// Never fail the install.
main().catch((e) => warn(`unexpected error: ${e?.message ?? e}`));
