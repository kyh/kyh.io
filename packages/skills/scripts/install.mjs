// `kyh-skills install`: puts this package into the agent ecosystem, the same
// way `npx skills` does:
//
//   1. Canonical store at ~/.agents — skills/<name> are copied here from the
//      package. "Universal" agents (codex, amp, opencode, goose, kimi) read
//      ~/.agents directly, so they need nothing further.
//   2. The exact skills listed per repo in external-skills.json are installed
//      globally with the bundled `skills` CLI (falls back to `npx skills`), all
//      repos in parallel by default (throttle with KYH_SKILLS_CONCURRENCY; skip
//      with KYH_SKILLS_NO_EXTERNAL=1). Any other skill the CLI installed from
//      those repos is then removed, so every machine converges on the list.
//   3. Non-universal agents (claude) get their own dirs symlinked to the
//      canonical store: ~/.claude/skills/<name> -> ~/.agents/skills/<name>.
//   4. CLAUDE.md is copied to ~/.claude/CLAUDE.md and mcp.json merged into
//      ~/.claude.json.
//
// Copies, not symlinks, for anything sourced from the package: under `npx` the
// package lives in a cache dir that is pruned and re-keyed per version, so a
// link into it would dangle. What we copied is recorded in STATE_FILE, which is
// how a skill dropped from the package gets removed and how a local edit to
// ~/.claude/CLAUDE.md is told apart from our own last write (edits get a .bak).

import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);

const PKG_ROOT = path.resolve(import.meta.dirname, "..");
const HOME = os.homedir();
const AGENTS_DIR = path.join(HOME, ".agents");
const CLAUDE_DIR = path.join(HOME, ".claude");
const STATE_FILE = path.join(AGENTS_DIR, ".kyh-skills.json");
const TAG = "[@kyh/skills]";

let DRY = false;
let failed = false;

const log = (...a) => console.log(TAG, ...a);
const warn = (...a) => {
  failed = true;
  console.warn(TAG, ...a);
};
const tilde = (p) => p.replace(HOME, "~");

// --- helpers -------------------------------------------------------------------

const backupPath = (p) => {
  let bak = `${p}.bak`;
  if (fs.existsSync(bak)) {
    bak = `${p}.bak-${Date.now()}`;
  }
  return bak;
};

// Deep content equality (follows symlinks), so an unchanged install is a no-op.
const sameContent = (a, b) => {
  try {
    const sa = fs.statSync(a);
    const sb = fs.statSync(b);
    if (sa.isFile() && sb.isFile()) {
      return sa.size === sb.size && fs.readFileSync(a).equals(fs.readFileSync(b));
    }
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
};

const samePath = (a, b) => {
  try {
    return fs.realpathSync(a) === fs.realpathSync(b);
  } catch {
    return false;
  }
};

const isSymlink = (p) => {
  try {
    return fs.lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
};

const ensureDir = (p) => {
  if (DRY || fs.existsSync(p)) {
    return;
  }
  fs.mkdirSync(p, { recursive: true });
};

const hashFile = (p) => {
  try {
    return createHash("sha256").update(fs.readFileSync(p)).digest("hex");
  } catch {
    return null;
  }
};

const readState = () => {
  try {
    const { claudeMd = null, skills = [] } = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
    return { claudeMd, skills };
  } catch {
    return { claudeMd: null, skills: [] };
  }
};

const writeState = (state) => {
  if (DRY) {
    return;
  }
  ensureDir(AGENTS_DIR);
  fs.writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`);
};

// Earlier versions symlinked into the package (a global npm install or a
// working copy) instead of copying. Those links are ours to replace or remove.
const LEGACY_TARGET = /[\\/](?:@kyh[\\/]skills|packages[\\/]skills)[\\/]/u;
const isLegacyLink = (p) => {
  if (!isSymlink(p)) {
    return false;
  }
  return LEGACY_TARGET.test(path.resolve(path.dirname(p), fs.readlinkSync(p)));
};

const remove = (p, why) => {
  if (DRY) {
    return log(`would remove ${why} ${tilde(p)}`);
  }
  fs.rmSync(p, { force: true, recursive: true });
  log(`removed ${why} ${tilde(p)}`);
};

// Copy src over dest. `owned` means dest is ours from a previous install, so it
// is replaced outright; anything else that differs is backed up first.
const copy = (src, dest, owned) => {
  const rel = tilde(dest);
  if (!isSymlink(dest) && sameContent(src, dest)) {
    return;
  }
  if (isSymlink(dest)) {
    if (!DRY) {
      fs.unlinkSync(dest);
    }
  } else if (fs.existsSync(dest)) {
    if (owned) {
      if (!DRY) {
        fs.rmSync(dest, { force: true, recursive: true });
      }
    } else {
      const bak = backupPath(dest);
      if (DRY) {
        return log(`would back up ${rel} -> ${path.basename(bak)} and copy`);
      }
      fs.renameSync(dest, bak);
      log(`backed up existing ${rel} -> ${path.basename(bak)}`);
    }
  }
  if (DRY) {
    return log(`would copy ${rel}`);
  }
  ensureDir(path.dirname(dest));
  fs.cpSync(src, dest, { recursive: true });
  log(`copied ${rel}`);
};

// Symlink src -> dest for the ~/.claude mirror of the canonical store.
const link = (src, dest) => {
  const rel = tilde(dest);
  try {
    ensureDir(path.dirname(dest));
    if (isSymlink(dest)) {
      if (samePath(dest, src)) {
        return;
      }
      if (DRY) {
        return log(`would relink ${rel}`);
      }
      fs.unlinkSync(dest);
    } else if (fs.existsSync(dest)) {
      // A real dir here came from another installer (or a copy fallback); a
      // matching one is harmless, a differing one is not ours to overwrite.
      if (!sameContent(src, dest)) {
        log(`left ${rel} alone (real dir, differs from ~/.agents)`);
      }
      return;
    } else if (DRY) {
      return log(`would link ${rel}`);
    }
    try {
      fs.symlinkSync(src, dest, process.platform === "win32" ? "junction" : "dir");
      log(`linked ${rel}`);
    } catch (error) {
      // Unprivileged (e.g. Windows without developer mode): copy.
      fs.cpSync(src, dest, { recursive: true });
      log(`copied ${rel} (symlink failed: ${error.code ?? error.message})`);
    }
  } catch (error) {
    warn(`failed to place ${rel}: ${error.message}`);
  }
};

// Removes symlinks in `dir` that point into `owner` at something that no longer
// exists — the ~/.claude mirror of a skill that left the canonical store. Links
// into anywhere else are left alone, even when broken: they belong to another
// installer.
const pruneDangling = (dir, owner) => {
  if (!fs.existsSync(dir)) {
    return;
  }
  for (const entry of fs.readdirSync(dir)) {
    const p = path.join(dir, entry);
    if (!isSymlink(p)) {
      continue;
    }
    const target = path.resolve(dir, fs.readlinkSync(p));
    if (!fs.existsSync(target) && target.startsWith(owner + path.sep)) {
      remove(p, "stale link");
    }
  }
};

const packageSkills = () => {
  const src = path.join(PKG_ROOT, "skills");
  return fs.existsSync(src)
    ? fs
        .readdirSync(src, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
    : [];
};

// --- 1. canonical store: package -> ~/.agents ----------------------------------

const installOwnSkills = () => {
  const state = readState();
  const shipped = packageSkills();
  const skillsDir = path.join(AGENTS_DIR, "skills");

  for (const name of state.skills.filter((n) => !shipped.includes(n))) {
    const dest = path.join(skillsDir, name);
    if (fs.existsSync(dest) || isSymlink(dest)) {
      remove(dest, "dropped skill");
    }
  }
  for (const dir of [skillsDir, path.join(AGENTS_DIR, "agents")]) {
    if (!fs.existsSync(dir)) {
      continue;
    }
    for (const entry of fs.readdirSync(dir)) {
      const p = path.join(dir, entry);
      if (isLegacyLink(p) && !(dir === skillsDir && shipped.includes(entry))) {
        remove(p, "legacy link");
      }
    }
  }

  for (const name of shipped) {
    copy(
      path.join(PKG_ROOT, "skills", name),
      path.join(skillsDir, name),
      state.skills.includes(name),
    );
  }
  writeState({ ...readState(), skills: shipped });
};

// --- 2. external skills: `skills add <repo> -g -s <skill>... -y`, then prune ---

// Path to the bundled `skills` CLI, or null to fall back to `npx skills`.
const skillsBin = () => {
  try {
    const pkgJson = require.resolve("skills/package.json");
    const { bin } = JSON.parse(fs.readFileSync(pkgJson, "utf-8"));
    // npm's `bin` contract: a bare string (single bin) or a name→path map.
    const rel = bin instanceof Object ? bin.skills : bin;
    if (rel) {
      return path.join(path.dirname(pkgJson), rel);
    }
  } catch {
    /* not installed (e.g. --ignore-scripts / odd layout) — use npx */
  }
  return null;
};

// Runs the `skills` CLI against the global ~/.agents store. Uses the bundled CLI
// directly (no npx resolution) when available.
const runSkills = async (args, bin, okMessage) => {
  const [cmd, argv, useShell] = bin
    ? [process.execPath, [bin, ...args], false]
    : ["npx", ["-y", "skills", ...args], process.platform === "win32"];
  // Parallel output would interleave; log per-call status instead.
  const child = spawn(cmd, argv, { shell: useShell, stdio: "ignore" });
  const label = `skills ${args.slice(0, 2).join(" ")}`;
  try {
    const [code] = await once(child, "close");
    if (code === 0) {
      log(okMessage);
    } else {
      warn(`${label} failed (exit ${code})`);
    }
  } catch (error) {
    warn(`${label} failed: ${error.message}`);
  }
};

const addRepo = ([repo, names], bin) =>
  runSkills(
    ["add", repo, "-g", ...names.flatMap((n) => ["-s", n]), "-y"],
    bin,
    `added ${names.length} skills from ${repo}`,
  );

// Skills the `skills` CLI installed from a curated repo that the manifest no
// longer lists. Pruning only curated repos' skills leaves anything added from
// elsewhere for `kyh-skills check` to flag rather than silently deleting it.
const unlistedSkills = (manifest) => {
  let lock;
  try {
    lock = JSON.parse(fs.readFileSync(path.join(AGENTS_DIR, ".skill-lock.json"), "utf-8"));
  } catch {
    return [];
  }
  return Object.entries(lock.skills ?? {})
    .filter(
      ([name, meta]) => manifest.has(meta.source) && !manifest.get(meta.source).includes(name),
    )
    .map(([name]) => name);
};

// Runs `fn` over `items` with at most `limit` in flight.
const pool = async (items, limit, fn) => {
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const item = items[next];
      next += 1;
      await fn(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
};

const installExternalSkills = async () => {
  if (process.env.KYH_SKILLS_NO_EXTERNAL) {
    return log("KYH_SKILLS_NO_EXTERNAL set — skipping external skills.");
  }

  const file = path.join(PKG_ROOT, "external-skills.json");
  if (!fs.existsSync(file)) {
    return;
  }

  let manifest;
  try {
    const { skills } = JSON.parse(fs.readFileSync(file, "utf-8"));
    manifest = new Map(Object.entries(skills ?? {}));
  } catch (error) {
    return warn(`could not parse external-skills.json: ${error.message}`);
  }
  const invalid = [...manifest].filter(([, names]) => !Array.isArray(names) || names.length === 0);
  if (invalid.length) {
    return warn(
      `external-skills.json: each repo needs a non-empty skill list (${invalid.map(([r]) => r).join(", ")}).`,
    );
  }
  if (manifest.size === 0) {
    return;
  }

  // Default: run every repo at once (they're network-bound git clones). Throttle
  // with KYH_SKILLS_CONCURRENCY (e.g. on a slow link, or to avoid concurrent
  // writes to the shared ~/.agents lock).
  const limit = Math.max(1, Number(process.env.KYH_SKILLS_CONCURRENCY) || manifest.size);
  if (DRY) {
    log(
      `would install external skills (concurrency ${limit}) from: ${[...manifest.keys()].join(", ")}`,
    );
    const stale = unlistedSkills(manifest);
    if (stale.length) {
      log(`would remove unlisted skills: ${stale.join(", ")}`);
    }
    return;
  }

  const bin = skillsBin();
  if (!bin) {
    // Fallback path: warm npx's cache once so the parallel workers don't each
    // race to resolve/download the CLI.
    try {
      spawnSync("npx", ["-y", "skills", "--help"], {
        shell: process.platform === "win32",
        stdio: "ignore",
      });
    } catch {
      /* best-effort warm-up */
    }
  }

  log(`installing external skills from ${manifest.size} repos (concurrency ${limit})…`);
  await pool([...manifest], limit, (entry) => addRepo(entry, bin));

  // Prune after the adds settle: the lock is only complete once they've all written.
  const stale = unlistedSkills(manifest);
  if (stale.length) {
    await runSkills(
      ["remove", ...stale, "-g", "-y"],
      bin,
      `removed unlisted skills: ${stale.join(", ")}`,
    );
  }
};

// --- 3. claude (non-universal): mirror ~/.agents/skills -> ~/.claude/skills -----
// Covers both this package's skills and any installed by `npx skills add`.

const linkClaude = () => {
  const claudeSkills = path.join(CLAUDE_DIR, "skills");
  pruneDangling(claudeSkills, AGENTS_DIR);
  pruneDangling(path.join(CLAUDE_DIR, "agents"), AGENTS_DIR);
  const src = path.join(AGENTS_DIR, "skills");
  if (!fs.existsSync(src)) {
    return;
  }
  for (const entry of fs.readdirSync(src).filter((e) => !e.startsWith("."))) {
    link(path.join(src, entry), path.join(claudeSkills, entry));
  }
};

// --- 4a. global CLAUDE.md --------------------------------------------------------

const installClaudeMd = () => {
  const src = path.join(PKG_ROOT, "CLAUDE.md");
  if (!fs.existsSync(src)) {
    return;
  }
  const dest = path.join(CLAUDE_DIR, "CLAUDE.md");
  const { claudeMd } = readState();
  const owned = isLegacyLink(dest) || (claudeMd !== null && hashFile(dest) === claudeMd);
  copy(src, dest, owned);
  writeState({ ...readState(), claudeMd: hashFile(src) });
};

// --- 4b. MCP: merge into ~/.claude.json mcpServers -------------------------------

const mergeMcp = () => {
  const src = path.join(PKG_ROOT, "mcp.json");
  if (!fs.existsSync(src)) {
    return;
  }

  let servers;
  try {
    servers = JSON.parse(fs.readFileSync(src, "utf-8")).mcpServers || {};
  } catch (error) {
    return warn(`could not parse mcp.json: ${error.message}`);
  }
  const names = Object.keys(servers);
  if (names.length === 0) {
    return;
  }

  const dest = path.join(HOME, ".claude.json");
  let config = {};
  if (fs.existsSync(dest)) {
    try {
      config = JSON.parse(fs.readFileSync(dest, "utf-8"));
    } catch (error) {
      return warn(`~/.claude.json is not valid JSON — skipping MCP merge (${error.message}).`);
    }
  }
  // Only add servers the user doesn't already have; never overwrite their
  // entries, so reinstalls don't reset local tweaks.
  const existing = config.mcpServers || {};
  const added = names.filter((n) => !(n in existing));
  if (added.length === 0) {
    return;
  }
  config.mcpServers = { ...servers, ...existing };

  if (DRY) {
    return log(`would add mcpServers to ~/.claude.json: ${added.join(", ")}`);
  }
  fs.writeFileSync(dest, `${JSON.stringify(config, null, 2)}\n`);
  log(`added mcpServers to ~/.claude.json: ${added.join(", ")}`);
};

// --- entry -----------------------------------------------------------------------

// Each phase is isolated: one failing phase must not skip the rest.
const step = async (fn) => {
  try {
    await fn();
  } catch (error) {
    warn(`${fn.name} failed: ${error?.message ?? error}`);
  }
};

export const install = async ({ dry = false } = {}) => {
  DRY = dry;
  failed = false;
  if (DRY) {
    log("dry run — no changes will be written.");
  }

  await step(installOwnSkills);
  await step(installExternalSkills);
  await step(linkClaude);
  await step(installClaudeMd);
  await step(mergeMcp);

  log(failed ? "done, with errors above." : "done.");
  return !failed;
};
