import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { externalSkillsSchema, readJson, skillLockSchema } from "./schemas.ts";

const here = import.meta.dirname;
const lockPath = path.join(homedir(), ".agents", ".skill-lock.json");
const agentsSkills = path.join(homedir(), ".agents", "skills");
const claudeSkills = path.join(homedir(), ".claude", "skills");
const extPath = path.join(here, "..", "external-skills.json");

const NON_REPO = new Set(["motion"]);

const skillNames = (dir: string) =>
  existsSync(dir) ? readdirSync(dir).filter((n) => !n.startsWith(".")) : [];

const report = (title: string, items: string[]) => {
  if (items.length === 0) {
    return;
  }

  console.error(`\n${title}`);

  for (const item of items) {
    console.error(`  - ${item}`);
  }
};

const readLock = () => {
  try {
    return readJson(lockPath, skillLockSchema);
  } catch {
    return null;
  }
};

export const check = () => {
  const lock = readLock();

  if (lock === null) {
    console.log(`skip: no lock at ${lockPath} (nothing to check on this machine)`);

    return true;
  }

  const ext = readJson(extPath, externalSkillsSchema);
  const listed = new Map(Object.entries(ext.skills));
  const unmanaged = new Set(ext.unmanaged);

  const installed = Object.entries(lock.skills).flatMap(([name, meta]) =>
    NON_REPO.has(name) || meta.source === undefined || meta.source === ""
      ? []
      : [{ name, source: meta.source }],
  );

  const installedNames = new Set(installed.map(({ name }) => name));

  const unlisted = installed
    .filter(({ name, source }) => listed.get(source)?.includes(name) !== true)
    .map(({ name, source }) => `${source}: ${name}`)
    .toSorted();

  const notInstalled = [...listed]
    .flatMap(([repo, names]) =>
      names.filter((n) => !installedNames.has(n)).map((n) => `${repo}: ${n}`),
    )
    .toSorted();

  const canonical = new Set(skillNames(agentsSkills));

  const untracked = skillNames(claudeSkills)
    .filter((n) => !canonical.has(n) && !unmanaged.has(n))
    .toSorted();

  report("UNLISTED (installed locally, not in external-skills.json):", unlisted);
  report("NOT INSTALLED (listed in external-skills.json, missing locally):", notInstalled);
  report("UNTRACKED in ~/.claude/skills (not in ~/.agents, so not in the lock):", untracked);

  if (unlisted.length > 0 || notInstalled.length > 0 || untracked.length > 0) {
    console.error("\nfail: external-skills.json is out of sync.");

    if (unlisted.length > 0) {
      console.error("  - list the skills you want to keep; `kyh-skills install` removes the rest.");
    }

    if (notInstalled.length > 0) {
      console.error("  - run `kyh-skills install` to install them, or drop them from the list.");
    }

    if (untracked.length > 0) {
      console.error(
        "  - reinstall them via `npx skills add <repo> -g -s <skill> -y` and list them," +
          " or, if a skill has no repo, list it under `unmanaged`.",
      );
    }

    return false;
  }

  console.log(
    `ok: ${installed.length} skills from ${listed.size} repos match external-skills.json.`,
  );

  return true;
};
