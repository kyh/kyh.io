import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import {
  claudeConfigSchema,
  externalSkillsSchema,
  mcpSchema,
  failure,
  packageBinSchema,
  readJson,
  skillLockSchema,
  stateSchema,
} from "./schemas.ts";

const require = createRequire(import.meta.url);

const closeEventSchema = z.tuple([z.number().nullable()]).rest(z.unknown());

const PKG_ROOT = path.resolve(import.meta.dirname, "..");
const HOME = os.homedir();
const AGENTS_DIR = path.join(HOME, ".agents");
const CLAUDE_DIR = path.join(HOME, ".claude");
const STATE_FILE = path.join(AGENTS_DIR, ".kyh-skills.json");
const TAG = "[@kyh/skills]";

let DRY = false;
let failed = false;

const log = (...a: unknown[]) => {
  console.log(TAG, ...a);
};

const warn = (...a: unknown[]) => {
  failed = true;
  console.warn(TAG, ...a);
};

const tilde = (p: string) => p.replace(HOME, "~");

const backupPath = (p: string) => {
  let bak = `${p}.bak`;

  if (fs.existsSync(bak)) {
    bak = `${p}.bak-${Date.now()}`;
  }

  return bak;
};

const sameContent: (a: string, b: string) => boolean = (a, b) => {
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

const samePath = (a: string, b: string) => {
  try {
    return fs.realpathSync(a) === fs.realpathSync(b);
  } catch {
    return false;
  }
};

const isSymlink = (p: string) => {
  try {
    return fs.lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
};

const ensureDir = (p: string) => {
  if (DRY || fs.existsSync(p)) {
    return;
  }

  fs.mkdirSync(p, { recursive: true });
};

const hashFile = (p: string) => {
  try {
    return createHash("sha256").update(fs.readFileSync(p)).digest("hex");
  } catch {
    return null;
  }
};

const readState = () => {
  try {
    return readJson(STATE_FILE, stateSchema);
  } catch {
    return { claudeMd: null, skills: [] };
  }
};

const writeState = (state: z.infer<typeof stateSchema>) => {
  if (DRY) {
    return;
  }

  ensureDir(AGENTS_DIR);
  fs.writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`);
};

const LEGACY_TARGET = /[\\/](?:@kyh[\\/]skills|packages[\\/]skills)[\\/]/u;

const isLegacyLink = (p: string) => {
  if (!isSymlink(p)) {
    return false;
  }

  return LEGACY_TARGET.test(path.resolve(path.dirname(p), fs.readlinkSync(p)));
};

const remove = (p: string, why: string) => {
  if (DRY) {
    log(`would remove ${why} ${tilde(p)}`);

    return;
  }

  fs.rmSync(p, { force: true, recursive: true });
  log(`removed ${why} ${tilde(p)}`);
};

const copy = (src: string, dest: string, owned: boolean) => {
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
        log(`would back up ${rel} -> ${path.basename(bak)} and copy`);

        return;
      }

      fs.renameSync(dest, bak);
      log(`backed up existing ${rel} -> ${path.basename(bak)}`);
    }
  }

  if (DRY) {
    log(`would copy ${rel}`);

    return;
  }

  ensureDir(path.dirname(dest));
  fs.cpSync(src, dest, { recursive: true });
  log(`copied ${rel}`);
};

const link = (src: string, dest: string) => {
  const rel = tilde(dest);

  try {
    ensureDir(path.dirname(dest));

    if (isSymlink(dest)) {
      if (samePath(dest, src)) {
        return;
      }

      if (DRY) {
        log(`would relink ${rel}`);

        return;
      }

      fs.unlinkSync(dest);
    } else if (fs.existsSync(dest)) {
      if (!sameContent(src, dest)) {
        log(`left ${rel} alone (real dir, differs from ~/.agents)`);
      }

      return;
    } else if (DRY) {
      log(`would link ${rel}`);

      return;
    }

    try {
      fs.symlinkSync(src, dest, process.platform === "win32" ? "junction" : "dir");
      log(`linked ${rel}`);
    } catch (error) {
      fs.cpSync(src, dest, { recursive: true });
      const { code, message } = failure.parse(error);
      log(`copied ${rel} (symlink failed: ${code ?? message})`);
    }
  } catch (error) {
    warn(`failed to place ${rel}: ${failure.parse(error).message}`);
  }
};

const pruneDangling = (dir: string, owner: string) => {
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

const skillsBin = () => {
  try {
    const pkgJson = require.resolve("skills/package.json");
    const { bin } = readJson(pkgJson, packageBinSchema);
    const rel = bin instanceof Object ? bin.skills : bin;

    if (rel !== undefined && rel !== "") {
      return path.join(path.dirname(pkgJson), rel);
    }
  } catch {
    return null;
  }

  return null;
};

const runSkills = async (args: string[], bin: string | null, okMessage: string) => {
  const [cmd, argv, useShell] =
    bin === null
      ? ["npx", ["-y", "skills", ...args], process.platform === "win32"]
      : [process.execPath, [bin, ...args], false];

  const child = spawn(cmd, argv, { shell: useShell, stdio: "ignore" });
  const label = `skills ${args.slice(0, 2).join(" ")}`;

  try {
    const [code] = closeEventSchema.parse(await once(child, "close"));

    if (code === 0) {
      log(okMessage);
    } else {
      warn(`${label} failed (exit ${code})`);
    }
  } catch (error) {
    warn(`${label} failed: ${failure.parse(error).message}`);
  }
};

const addRepo = async ([repo, names]: [string, string[]], bin: string | null) => {
  await runSkills(
    ["add", repo, "-g", ...names.flatMap((n) => ["-s", n]), "-y"],
    bin,
    `added ${names.length} skills from ${repo}`,
  );
};

const unlistedSkills = (manifest: Map<string, string[]>) => {
  try {
    const lock = readJson(path.join(AGENTS_DIR, ".skill-lock.json"), skillLockSchema);

    return Object.entries(lock.skills)
      .filter(([name, meta]) => manifest.get(meta.source ?? "")?.includes(name) !== true)
      .map(([name]) => name);
  } catch {
    return [];
  }
};

const pool = async <T>(items: T[], limit: number, fn: (item: T) => Promise<void>) => {
  let next = 0;

  const worker: () => Promise<void> = async () => {
    const item = items[next];

    if (next >= items.length || item === undefined) {
      return;
    }

    next += 1;
    await fn(item);
    await worker();
  };

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
};

const readManifest = (file: string) => {
  try {
    return new Map(Object.entries(readJson(file, externalSkillsSchema).skills));
  } catch (error) {
    warn(`could not parse external-skills.json: ${failure.parse(error).message}`);

    return null;
  }
};

const concurrencyOf = (fallback = 1) => {
  const raw = Number(process.env.KYH_SKILLS_CONCURRENCY);

  return Math.max(1, Number.isNaN(raw) || raw === 0 ? fallback : raw);
};

const installExternalSkills = async () => {
  const skip = process.env.KYH_SKILLS_NO_EXTERNAL;

  if (skip !== undefined && skip !== "") {
    log("KYH_SKILLS_NO_EXTERNAL set — skipping external skills.");

    return;
  }

  const file = path.join(PKG_ROOT, "external-skills.json");

  if (!fs.existsSync(file)) {
    return;
  }

  const manifest = readManifest(file);

  if (manifest === null) {
    return;
  }

  const invalid = [...manifest].filter(([, names]) => names.length === 0);

  if (invalid.length > 0) {
    warn(
      `external-skills.json: each repo needs a non-empty skill list (${invalid.map(([r]) => r).join(", ")}).`,
    );

    return;
  }

  if (manifest.size === 0) {
    return;
  }

  const limit = concurrencyOf(manifest.size);

  if (DRY) {
    log(
      `would install external skills (concurrency ${limit}) from: ${[...manifest.keys()].join(", ")}`,
    );
    const stale = unlistedSkills(manifest);

    if (stale.length > 0) {
      log(`would remove unlisted skills: ${stale.join(", ")}`);
    }

    return;
  }

  const bin = skillsBin();

  if (bin === null) {
    spawnSync("npx", ["-y", "skills", "--help"], {
      shell: process.platform === "win32",
      stdio: "ignore",
    });
  }

  log(`installing external skills from ${manifest.size} repos (concurrency ${limit})…`);
  await pool([...manifest], limit, async (entry) => {
    await addRepo(entry, bin);
  });

  const stale = unlistedSkills(manifest);

  if (stale.length > 0) {
    await runSkills(
      ["remove", ...stale, "-g", "-y"],
      bin,
      `removed unlisted skills: ${stale.join(", ")}`,
    );
  }
};

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

const readServers = (src: string) => {
  try {
    return readJson(src, mcpSchema).mcpServers;
  } catch (error) {
    warn(`could not parse mcp.json: ${failure.parse(error).message}`);

    return null;
  }
};

const readClaudeConfig = (dest: string) => {
  if (!fs.existsSync(dest)) {
    return claudeConfigSchema.parse({});
  }

  try {
    return readJson(dest, claudeConfigSchema);
  } catch (error) {
    warn(
      `~/.claude.json is not valid JSON — skipping MCP merge (${failure.parse(error).message}).`,
    );

    return null;
  }
};

const mergeMcp = () => {
  const src = path.join(PKG_ROOT, "mcp.json");

  if (!fs.existsSync(src)) {
    return;
  }

  const servers = readServers(src);

  if (servers === null) {
    return;
  }

  const names = Object.keys(servers);

  if (names.length === 0) {
    return;
  }

  const dest = path.join(HOME, ".claude.json");
  const config = readClaudeConfig(dest);

  if (config === null) {
    return;
  }

  const existing = config.mcpServers ?? {};
  const added = names.filter((n) => !(n in existing));

  if (added.length === 0) {
    return;
  }

  config.mcpServers = { ...servers, ...existing };

  if (DRY) {
    log(`would add mcpServers to ~/.claude.json: ${added.join(", ")}`);

    return;
  }

  fs.writeFileSync(dest, `${JSON.stringify(config, null, 2)}\n`);
  log(`added mcpServers to ~/.claude.json: ${added.join(", ")}`);
};

const step = async (fn: () => void | Promise<void>) => {
  try {
    await fn();
  } catch (error) {
    warn(`${fn.name} failed: ${failure.parse(error).message}`);
  }
};

export const install = async ({ dry = false }: { dry?: boolean } = {}) => {
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
