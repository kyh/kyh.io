#!/usr/bin/env node
// Links this package into the agent ecosystem, the same way `npx skills` does:
//
//   1. Canonical store at ~/.agents — skills/<name> and agents/<name>.md are
//      symlinked here from the package. "Universal" agents (codex, amp, opencode,
//      goose, kimi) read ~/.agents directly, so they need nothing further.
//   2. Non-universal agents (claude) get their own dirs symlinked to the canonical
//      store: ~/.claude/skills/<name> -> ~/.agents/skills/<name>, etc.
//   3. CLAUDE.md -> ~/.claude/CLAUDE.md and mcp.json merged into ~/.claude.json.
//
// Runs on `postinstall`. Idempotent, non-destructive (real files are backed up,
// never deleted), falls back to copying when symlinks aren't permitted, and never
// throws — a failed link must not break `npm install`.
//
// Auto-skips local dependency installs (use `npm i -g`, or KYH_SKILLS_FORCE=1 to
// link a working copy) and CI. Skip entirely with KYH_SKILLS_NO_LINK=1. Preview
// with --dry-run (or KYH_SKILLS_DRY_RUN=1).

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PKG_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOME = os.homedir();
const AGENTS_DIR = path.join(HOME, ".agents"); // canonical store (read directly by universal agents)
const CLAUDE_DIR = path.join(HOME, ".claude"); // non-universal: symlinks into the canonical store

const DRY = process.argv.includes("--dry-run") || !!process.env.KYH_SKILLS_DRY_RUN;
const FORCE = !!process.env.KYH_SKILLS_FORCE;
const TAG = "[@kyh/skills]";

const log = (...a) => console.log(TAG, ...a);
const warn = (...a) => console.warn(TAG, ...a);

function main() {
  if (process.env.KYH_SKILLS_NO_LINK) return log("KYH_SKILLS_NO_LINK set — skipping.");
  if (process.env.CI) return log("CI detected — skipping link.");
  // A local dependency install would point the canonical symlinks at a project's
  // node_modules, which breaks when that tree is removed. Detect it by checking
  // whether the package lives under the current working directory (true for a
  // project dep, false for a global install). Run by hand or set KYH_SKILLS_FORCE
  // to link anyway.
  const looksLocal = PKG_ROOT.startsWith(process.cwd() + path.sep);
  if (process.env.npm_lifecycle_event === "postinstall" && looksLocal && !FORCE)
    return log("local dependency install — skipping. Use `npm i -g`, or KYH_SKILLS_FORCE=1 to link this copy.");
  if (process.platform === "win32")
    warn("Windows symlinks may need admin/developer mode; will fall back to copying.");
  if (DRY) log("dry run — no changes will be written.");

  ensureDir(path.join(AGENTS_DIR, "skills"));
  ensureDir(path.join(AGENTS_DIR, "agents"));
  ensureDir(path.join(CLAUDE_DIR, "skills"));
  ensureDir(path.join(CLAUDE_DIR, "agents"));

  // Each phase is isolated: one failing phase must not skip the rest.
  step(linkCanonical); // package -> ~/.agents
  step(linkClaude); // ~/.agents -> ~/.claude
  step(linkClaudeMd);
  step(mergeMcp);

  log("done. Universal agents (codex, amp, opencode, goose, kimi) read ~/.agents directly.");
}

function step(fn) {
  try {
    fn();
  } catch (e) {
    warn(`${fn.name} failed: ${e?.message ?? e}`);
  }
}

// --- canonical store: package -> ~/.agents -------------------------------------

function linkCanonical() {
  forEachSkill((name, src) => place(src, path.join(AGENTS_DIR, "skills", name), "dir"));
  forEachAgent((name, src) => place(src, path.join(AGENTS_DIR, "agents", name), "file"));
}

// --- claude (non-universal): ~/.agents -> ~/.claude ----------------------------

function linkClaude() {
  forEachSkill((name) =>
    place(path.join(AGENTS_DIR, "skills", name), path.join(CLAUDE_DIR, "skills", name), "dir"),
  );
  forEachAgent((name) =>
    place(path.join(AGENTS_DIR, "agents", name), path.join(CLAUDE_DIR, "agents", name), "file"),
  );
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
  config.mcpServers = { ...config.mcpServers, ...servers };

  if (DRY) return log(`would merge mcpServers into ~/.claude.json: ${names.join(", ")}`);
  fs.writeFileSync(dest, JSON.stringify(config, null, 2) + "\n");
  log(`merged mcpServers into ~/.claude.json: ${names.join(", ")}`);
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
    if (isSymlink(dest)) {
      if (samePath(dest, src)) return; // already linked to the right place
      if (DRY) return log(`would relink ${rel}`);
      fs.unlinkSync(dest);
    } else if (fs.existsSync(dest)) {
      const bak = backupPath(dest);
      if (DRY) return log(`would back up ${rel} -> ${path.basename(bak)} and link`);
      fs.renameSync(dest, bak);
      warn(`backed up existing ${rel} -> ${path.basename(bak)}`);
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

function backupPath(p) {
  let bak = `${p}.bak`;
  if (fs.existsSync(bak)) bak = `${p}.bak-${Date.now()}`;
  return bak;
}

try {
  main();
} catch (e) {
  // Never fail the install.
  warn(`unexpected error: ${e?.message ?? e}`);
}
