#!/usr/bin/env node
// Symlinks this package's skills + agents + CLAUDE.md into ~/.claude, the agents
// into ~/.codex/agents, and merges mcp.json into ~/.claude.json.
//
// Runs on `postinstall`. Idempotent, non-destructive (real files are backed up,
// never deleted), and never throws — a failed link must not break `npm install`.
//
// Auto-skips non-global installs (use `npm i -g`, or KYH_SKILLS_FORCE=1 to link a
// local/working copy) and CI. Skip entirely with KYH_SKILLS_NO_LINK=1. Preview
// with --dry-run (or KYH_SKILLS_DRY_RUN=1).

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PKG_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOME = os.homedir();
const CLAUDE_DIR = path.join(HOME, ".claude");
const CODEX_DIR = path.join(HOME, ".codex");

const DRY = process.argv.includes("--dry-run") || !!process.env.KYH_SKILLS_DRY_RUN;
const FORCE = !!process.env.KYH_SKILLS_FORCE;
const TAG = "[@kyh/skills]";

const log = (...a) => console.log(TAG, ...a);
const warn = (...a) => console.warn(TAG, ...a);

function main() {
  if (process.env.KYH_SKILLS_NO_LINK) return log("KYH_SKILLS_NO_LINK set — skipping.");
  if (process.env.CI) return log("CI detected — skipping link.");
  // A local/workspace install would point global symlinks at a project's
  // node_modules, which breaks when that tree is removed. Only auto-link for
  // global installs; running the script by hand (not via postinstall) or setting
  // KYH_SKILLS_FORCE=1 still links the current copy.
  if (
    process.env.npm_lifecycle_event === "postinstall" &&
    process.env.npm_config_global !== "true" &&
    !FORCE
  )
    return log("non-global install — skipping. Use `npm i -g`, or KYH_SKILLS_FORCE=1 to link this copy.");
  if (process.platform === "win32")
    warn("Windows symlinks may require admin/developer mode; continuing best-effort.");
  if (DRY) log("dry run — no changes will be written.");

  ensureDir(path.join(CLAUDE_DIR, "skills"));
  ensureDir(path.join(CLAUDE_DIR, "agents"));
  ensureDir(path.join(CODEX_DIR, "agents"));

  // Each phase is isolated: one failing phase must not skip the rest.
  step(linkSkills);
  step(linkClaudeAgents);
  step(linkCodexAgents);
  step(linkClaudeMd);
  step(mergeMcp);

  log("done.");
}

function step(fn) {
  try {
    fn();
  } catch (e) {
    warn(`${fn.name} failed: ${e?.message ?? e}`);
  }
}

// --- Claude: skills (one symlinked dir per skill) ------------------------------

function linkSkills() {
  const src = path.join(PKG_ROOT, "skills");
  if (!fs.existsSync(src)) return;
  for (const name of dirents(src, "dir"))
    symlink(path.join(src, name), path.join(CLAUDE_DIR, "skills", name), "dir");
}

// --- agents (same .md, symlinked into both Claude and Codex) -------------------

function linkClaudeAgents() {
  linkAgentsInto(path.join(CLAUDE_DIR, "agents"));
}

function linkCodexAgents() {
  linkAgentsInto(path.join(CODEX_DIR, "agents"));
}

function linkAgentsInto(destDir) {
  const src = path.join(PKG_ROOT, "agents");
  if (!fs.existsSync(src)) return;
  for (const name of dirents(src, "file").filter((f) => f.endsWith(".md")))
    symlink(path.join(src, name), path.join(destDir, name), "file");
}

// --- global CLAUDE.md ----------------------------------------------------------

function linkClaudeMd() {
  const src = path.join(PKG_ROOT, "CLAUDE.md");
  if (fs.existsSync(src)) symlink(src, path.join(CLAUDE_DIR, "CLAUDE.md"), "file");
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

function symlink(src, dest, type) {
  const rel = dest.replace(HOME, "~");
  try {
    if (fs.existsSync(dest) || isSymlink(dest)) {
      if (isSymlink(dest) && samePath(dest, src)) return; // already linked
      if (isSymlink(dest)) {
        if (DRY) return log(`would relink ${rel}`);
        fs.unlinkSync(dest);
      } else {
        const bak = backupPath(dest);
        if (DRY) return log(`would back up ${rel} -> ${path.basename(bak)} and link`);
        fs.renameSync(dest, bak);
        warn(`backed up existing ${rel} -> ${path.basename(bak)}`);
      }
    } else if (DRY) {
      return log(`would link ${rel}`);
    }
    fs.symlinkSync(src, dest, type === "dir" ? "dir" : "file");
    log(`linked ${rel}`);
  } catch (e) {
    warn(`failed to link ${rel}: ${e.message}`);
  }
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
