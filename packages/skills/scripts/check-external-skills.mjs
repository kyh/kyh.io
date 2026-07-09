#!/usr/bin/env node
// Drift check: every 3p skill installed locally (via the `skills` CLI) should be
// reproducible by `external-skills.json`. The skills CLI records each install in
// `~/.agents/.skill-lock.json` with its source repo — compare that against the
// curated repo list so a fresh `npm i -g @kyh/skills` recreates what we run.
//
// The lock lives in the user's home dir, NOT the repo, so this only works on a
// machine that has the skills installed. CI has no lock -> the check is skipped.
// Run manually (e.g. before a release): `node scripts/check-external-skills.mjs`.
//
// The lock only sees what the `skills` CLI installed, so it can't catch a skill
// dropped straight into an agent's own dir by some other installer. `link.mjs`
// mirrors ~/.agents/skills -> ~/.claude/skills, so we catch those by name: a
// skill Claude can see with no counterpart in the canonical store came from
// somewhere this repo doesn't control, and a fresh install won't recreate it.
//
// Not every skill comes from a repo (e.g. `motion` = Motion AI Kit from
// motion.dev). List those here so they don't trip the check.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const lockPath = join(homedir(), ".agents", ".skill-lock.json");
const agentsSkills = join(homedir(), ".agents", "skills");
const claudeSkills = join(homedir(), ".claude", "skills");
const extPath = join(here, "..", "external-skills.json");

// Skills intentionally not sourced from a `skills add <repo>` install.
const NON_REPO = new Set(["motion"]);

const read = (p) => JSON.parse(readFileSync(p, "utf8"));

let lock;
try {
  lock = read(lockPath);
} catch {
  console.log(`skip: no lock at ${lockPath} (nothing to check on this machine)`);
  process.exit(0);
}

const ext = read(extPath);
const listed = new Set(ext.repos);

const lockedRepos = new Set();
const skipped = [];
for (const [name, meta] of Object.entries(lock.skills ?? {})) {
  if (NON_REPO.has(name)) {
    skipped.push(name);
    continue;
  }
  if (meta.source) lockedRepos.add(meta.source);
}

const missing = [...lockedRepos].filter((r) => !listed.has(r)).toSorted();
const dead = [...listed].filter((r) => !lockedRepos.has(r)).toSorted();

// Compare names, not symlink-ness: `place()` copies instead of symlinking where
// symlinks aren't permitted, so a real dir in ~/.claude is only drift when the
// canonical store has no entry of that name at all.
const skillNames = (dir) =>
  existsSync(dir) ? readdirSync(dir).filter((n) => !n.startsWith(".")) : [];

const canonical = new Set(skillNames(agentsSkills));
const untracked = skillNames(claudeSkills)
  .filter((n) => !canonical.has(n))
  .toSorted();

if (skipped.length) console.log(`note: skipped non-repo skills: ${skipped.join(", ")}`);

if (missing.length) {
  console.error("\nMISSING from external-skills.json (installed locally, not curated):");
  for (const r of missing) console.error(`  - ${r}`);
}
if (untracked.length) {
  console.error("\nUNTRACKED in ~/.claude/skills (not in ~/.agents, so not in the lock):");
  for (const n of untracked) console.error(`  - ${n}`);
}
if (dead.length) {
  console.warn("\nDEAD in external-skills.json (curated, but no installed skill came from it):");
  for (const r of dead) console.warn(`  - ${r}`);
}

if (missing.length || untracked.length) {
  console.error("\nfail: external-skills.json is out of sync.");
  if (missing.length) console.error("  - add the missing repos above.");
  if (untracked.length)
    console.error(
      "  - delete the untracked skills, then reinstall their repo with" +
        " `npx skills add <repo> -g -s '*' -y` so they land in ~/.agents and the lock." +
        " A DEAD entry above is often the repo they belong to.",
    );
  process.exit(1);
}
console.log(
  dead.length
    ? "\nok with warnings: no missing repos (dead entries above are advisory)."
    : `\nok: external-skills.json matches all ${lockedRepos.size} locally installed source repos.`,
);
