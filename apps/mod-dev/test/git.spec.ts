import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";

import { DIFF_SCRIPT, parseDiff } from "../hooks/git";

const git = (cwd: string, ...args: string[]) =>
  execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], {
    cwd,
    encoding: "utf-8",
  });

const run = (cwd: string, ref = "") =>
  spawnSync("sh", ["-c", DIFF_SCRIPT, "score", ref], { cwd, encoding: "utf-8" });

describe("DIFF_SCRIPT", () => {
  let repo = "";

  before(() => {
    repo = mkdtempSync(path.join(tmpdir(), "mod-dev-"));
    git(repo, "init", "-q", "-b", "main");
    writeFileSync(path.join(repo, "a.ts"), "export const a = 1;\n");
    git(repo, "add", "-A");
    git(repo, "commit", "-qm", "base");
    git(repo, "checkout", "-qb", "feature");
    writeFileSync(path.join(repo, "b.ts"), "export const b = 2;\n");
    git(repo, "add", "-A");
    git(repo, "commit", "-qm", "add b");
    writeFileSync(path.join(repo, "a.ts"), "export const a = 3;\n");
    writeFileSync(path.join(repo, "new.ts"), "export const fresh = true;\n");
    writeFileSync(path.join(repo, "pnpm-lock.yaml"), "lockfileVersion: 9\n");
  });

  after(() => {
    rmSync(repo, { force: true, recursive: true });
  });

  it("diffs commits, edits and untracked files against the merge base", () => {
    const { status, stdout } = run(repo);
    assert.equal(status, 0);
    const diff = parseDiff(stdout);
    assert.equal(diff.base, git(repo, "merge-base", "HEAD", "main").trim());
    assert.equal(diff.against, "main");
    assert.match(
      diff.stat,
      /a\.ts[\s\S]*b\.ts[\s\S]*new\.ts[\s\S]*pnpm-lock\.yaml[\s\S]*4 files changed/u,
    );
    assert.match(diff.patch, /\+export const a = 3;/u);
    assert.match(diff.patch, /\+export const b = 2;/u);
    assert.match(diff.patch, /\+export const fresh = true;/u);
    assert.doesNotMatch(diff.patch, /lockfileVersion/u);
  });

  it("leaves the real index alone", () => {
    run(repo);
    assert.equal(git(repo, "status", "--porcelain"), " M a.ts\n?? new.ts\n?? pnpm-lock.yaml\n");
  });

  it("measures from a ref when given one, and says when it names no commit", () => {
    const diff = parseDiff(run(repo, "HEAD").stdout);
    assert.equal(diff.against, "HEAD");
    assert.doesNotMatch(diff.stat, /b\.ts/u);
    const missing = run(repo, "nope");
    assert.equal(missing.status, 2);
    assert.equal(missing.stderr.trim(), "nope is not a commit");
  });

  it("has nothing to show on a clean tree", () => {
    const clean = mkdtempSync(path.join(tmpdir(), "mod-dev-"));
    git(clean, "init", "-q", "-b", "main");
    writeFileSync(path.join(clean, "a.ts"), "1\n");
    git(clean, "add", "-A");
    git(clean, "commit", "-qm", "base");
    const diff = parseDiff(run(clean).stdout);
    rmSync(clean, { force: true, recursive: true });
    assert.deepEqual({ ...diff, base: "" }, { against: "main", base: "", patch: "", stat: "" });
  });

  it("exits 3 outside a repository", () => {
    const outside = mkdtempSync(path.join(tmpdir(), "mod-dev-"));
    const { status } = run(outside);
    rmSync(outside, { force: true, recursive: true });
    assert.equal(status, 3);
  });
});
