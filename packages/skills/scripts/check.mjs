// `kyh-skills check` — drift check: the 3p skills installed locally (via the `skills` CLI) should be
// exactly what `external-skills.json` lists. The skills CLI records each install
// in `~/.agents/.skill-lock.json` with its source repo — compare that against the
// curated per-repo lists so a fresh `npm i -g @kyh/skills` recreates what we run.
//
// The lock lives in the user's home dir, NOT the repo, so this only works on a
// machine that has the skills installed. CI has no lock -> the check is skipped.
// Run manually (e.g. before a release): `kyh-skills check`.
//
// The lock only sees what the `skills` CLI installed, so it can't catch a skill
// dropped straight into an agent's own dir by some other installer. `kyh-skills install`
// mirrors ~/.agents/skills -> ~/.claude/skills, so we catch those by name: a
// skill Claude can see with no counterpart in the canonical store came from
// somewhere this repo doesn't control, and a fresh install won't recreate it.
// Ones we keep on purpose go under `unmanaged` in external-skills.json.
//
// Not every skill comes from a repo (e.g. `motion` = Motion AI Kit from
// motion.dev). List those here so they don't trip the check.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const here = import.meta.dirname;
const lockPath = path.join(homedir(), ".agents", ".skill-lock.json");
const agentsSkills = path.join(homedir(), ".agents", "skills");
const claudeSkills = path.join(homedir(), ".claude", "skills");
const extPath = path.join(here, "..", "external-skills.json");

// Skills intentionally not sourced from a `skills add <repo>` install.
const NON_REPO = new Set(["motion"]);

const read = (p) => JSON.parse(readFileSync(p, "utf-8"));

// Compare names, not symlink-ness: the install copies instead of symlinking where
// symlinks aren't permitted, so a real dir in ~/.claude is only drift when the
// canonical store has no entry of that name at all.
const skillNames = (dir) =>
  existsSync(dir) ? readdirSync(dir).filter((n) => !n.startsWith(".")) : [];

const report = (title, items) => {
  if (items.length === 0) {
    return;
  }
  console.error(`\n${title}`);
  for (const item of items) {
    console.error(`  - ${item}`);
  }
};

export const check = () => {
  let lock;
  try {
    lock = read(lockPath);
  } catch {
    console.log(`skip: no lock at ${lockPath} (nothing to check on this machine)`);
    return true;
  }

  const ext = read(extPath);
  const listed = new Map(Object.entries(ext.skills ?? {}));
  const unmanaged = new Set(ext.unmanaged);

  const installed = Object.entries(lock.skills ?? {}).filter(
    ([name, meta]) => !NON_REPO.has(name) && meta.source,
  );
  const installedNames = new Set(installed.map(([name]) => name));

  const unlisted = installed
    .filter(([name, meta]) => !listed.get(meta.source)?.includes(name))
    .map(([name, meta]) => `${meta.source}: ${name}`)
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

  if (unlisted.length || notInstalled.length || untracked.length) {
    console.error("\nfail: external-skills.json is out of sync.");
    if (unlisted.length) {
      console.error("  - list the skills you want to keep; `kyh-skills install` removes the rest.");
    }
    if (notInstalled.length) {
      console.error("  - run `kyh-skills install` to install them, or drop them from the list.");
    }
    if (untracked.length) {
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
