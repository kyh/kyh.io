import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ledgerOf } from "../hooks/evidence";
import type { Use } from "../hooks/evidence";
import {
  checksOf,
  countsFor,
  dirsUp,
  gapText,
  gapsOf,
  isAsking,
  isShipping,
  isWaitingOn,
  managerOf,
  needsOf,
  packageFrom,
  reviewText,
  unverifiedOf,
} from "../hooks/proof";
import type { Kind } from "../hooks/commands";
import type { Package } from "../hooks/proof";

const ROOT = "/repo";

const web: Package = {
  dir: "apps/web",
  name: "@repo/web",
  scripts: ["dev", "lint", "test", "typecheck"],
};
const lib: Package = { dir: "packages/lib", name: "@repo/lib", scripts: ["typecheck"] };

const packageOf = (file: string) => {
  if (file.startsWith("apps/web/")) {
    return web;
  }
  return file.startsWith("packages/lib/") ? lib : undefined;
};

const write = (file: string): Use => ({
  command: "",
  file: `${ROOT}/${file}`,
  isBackground: false,
  isError: false,
  output: "",
  tool: "Write",
});

const bash = (command: string, isError = false): Use => ({
  command,
  file: "",
  isBackground: false,
  isError,
  output: "",
  tool: "Bash",
});

describe("needsOf", () => {
  it("needs what the package of each edited file offers, e2e for a source file of an app", () => {
    assert.deepEqual(
      needsOf(["apps/web/src/page.tsx", "packages/lib/index.ts"], packageOf, "pnpm"),
      [
        { command: "pnpm -F @repo/web typecheck", kind: "static", pkg: web },
        { command: "pnpm -F @repo/lib typecheck", kind: "static", pkg: lib },
        { command: "pnpm -F @repo/web test", kind: "test", pkg: web },
        { command: "pnpm -F @repo/web dev, then drive the change", kind: "e2e", pkg: web },
      ],
    );
  });

  it("needs nothing for docs, and no e2e for tests alone", () => {
    assert.deepEqual(needsOf(["apps/web/README.md", "docs/logo.svg"], packageOf, "pnpm"), []);
    assert.deepEqual(
      needsOf(["apps/web/test/page.spec.ts"], packageOf, "pnpm").map((need) => need.kind),
      ["static", "test"],
    );
  });

  it("spells the commands for the repository's package manager", () => {
    const [need] = needsOf(["packages/lib/index.ts"], packageOf, "yarn");
    assert.equal(need?.command, "yarn workspace @repo/lib typecheck");
    const root: Package = { dir: "", name: "app", scripts: ["test"] };
    assert.equal(needsOf(["index.js"], () => root, "npm")[0]?.command, "npm run test");
    assert.equal(
      needsOf(["packages/lib/index.ts"], packageOf, "npm")[0]?.command,
      "cd packages/lib && npm run typecheck",
    );
  });
});

describe("managerOf", () => {
  it("reads the packageManager field, npm without one", () => {
    assert.equal(managerOf('{ "packageManager": "pnpm@10.0.0" }'), "pnpm");
    assert.equal(managerOf('{"packageManager":"bun@1.2.0"}'), "bun");
    assert.equal(managerOf(""), "npm");
  });
});

describe("unverifiedOf", () => {
  it("reads each check Claude said it could not run, with its reason", () => {
    const reply = [
      "Done. Tests pass.",
      "",
      "Unverified: e2e — needs the production database",
      "- **Unverified:** static: the repo has no typecheck",
      "Unverified: e2e — said twice",
      "Unverified: everything",
    ].join("\n");
    assert.deepEqual(
      [...unverifiedOf(reply)],
      [
        ["e2e", "needs the production database"],
        ["static", "the repo has no typecheck"],
      ],
    );
  });
});

describe("checksOf", () => {
  const needs = needsOf(["apps/web/src/page.tsx"], packageOf, "pnpm");

  it("marks each needed check as the ledger has it after the last edit", () => {
    const ledger = ledgerOf(
      [
        bash("pnpm -F @repo/web test"),
        write("apps/web/src/page.tsx"),
        bash("pnpm -F @repo/web typecheck"),
      ],
      ROOT,
    );
    assert.deepEqual(
      checksOf(ledger, needs, new Map()).map(({ kind, mark }) => [kind, mark]),
      [
        ["static", "pass"],
        ["test", "stale"],
        ["e2e", "none"],
      ],
    );
  });

  it("counts a check only for the packages it ran for", () => {
    const both = needsOf(["apps/web/src/page.tsx", "packages/lib/index.ts"], packageOf, "pnpm");
    const statics = (...commands: string[]) =>
      checksOf(
        ledgerOf(
          [
            write("apps/web/src/page.tsx"),
            write("packages/lib/index.ts"),
            ...commands.map((command) => bash(command)),
          ],
          ROOT,
        ),
        both,
        new Map(),
      ).find((check) => check.kind === "static");
    assert.deepEqual(statics("pnpm -F @repo/web typecheck"), {
      hint: "pnpm -F @repo/lib typecheck",
      kind: "static",
      mark: "none",
    });
    assert.equal(
      statics("pnpm -F @repo/web typecheck", "cd packages/lib && pnpm typecheck")?.mark,
      "pass",
    );
    // A root check names no package, so it counts for all of them.
    assert.equal(statics("pnpm typecheck")?.mark, "pass");
    // A failure in one package fails the kind, even when another passed.
    const failed = checksOf(
      ledgerOf(
        [
          write("apps/web/src/page.tsx"),
          write("packages/lib/index.ts"),
          bash("pnpm -F @repo/web typecheck"),
          bash("pnpm -F @repo/lib typecheck", true),
        ],
        ROOT,
      ),
      both,
      new Map(),
    ).find((check) => check.kind === "static");
    assert.equal(failed?.mark, "fail");
  });

  it("tells a package from one whose name or directory starts the same", () => {
    const webs: Package = { dir: "apps/webs", name: "@repo/webs", scripts: ["typecheck"] };
    assert.equal(countsFor("pnpm -F @repo/webs typecheck", web, [web, webs]), false);
    assert.equal(countsFor("cd apps/webs && pnpm typecheck", web, [web, webs]), false);
    assert.equal(countsFor("pnpm --filter=@repo/web typecheck", web, [web, webs]), true);
  });

  it("takes Claude's word on a check it could not run, never over a pass", () => {
    const ledger = ledgerOf(
      [write("apps/web/src/page.tsx"), bash("pnpm -F @repo/web typecheck")],
      ROOT,
    );
    const checks = checksOf(
      ledger,
      needs,
      new Map<Kind, string>([
        ["e2e", "no browser here"],
        ["static", "skipped"],
      ]),
    );
    assert.deepEqual(
      checks.find((check) => check.kind === "e2e"),
      {
        hint: "no browser here",
        kind: "e2e",
        mark: "waived",
      },
    );
    assert.equal(checks.find((check) => check.kind === "static")?.mark, "pass");
    assert.deepEqual(
      gapsOf(checks).map((gap) => gap.kind),
      ["test"],
    );
  });
});

describe("what the gate says", () => {
  it("names each gap and how to close it", () => {
    const text = gapText([
      { hint: "pnpm -F @repo/web test", kind: "test", mark: "stale" },
      { hint: "pnpm -F @repo/web dev, then drive the change", kind: "e2e", mark: "none" },
    ]);
    assert.match(text, /^mod-dev: this change isn't proven yet/u);
    assert.match(text, /\n- test ran before your last edit: pnpm -F @repo\/web test\n/u);
    assert.match(
      text,
      /\n- e2e never ran: pnpm -F @repo\/web dev, then drive the change \(agent-browser/u,
    );
    assert.match(text, /`Unverified: <check> — <why>`/u);
  });

  it("passes the reviewer's fixes on in order", () => {
    assert.equal(
      reviewText(
        "fix first",
        ["idiomatic 6 < 7"],
        ["use the config helper (src/lib/config.ts:40)"],
      ),
      "mod-dev: the reviewer says fix first (idiomatic 6 < 7). Fix these, then check again:\n1. use the config helper (src/lib/config.ts:40)\nIf a finding is wrong, say why in your reply instead; the reviewer reads it.",
    );
  });

  it("knows a push or a pull request when it sees one", () => {
    assert.equal(isShipping("Bash", "git push -u origin HEAD"), true);
    assert.equal(isShipping("Bash", "git -C apps/kyh push"), true);
    assert.equal(isShipping("Bash", "gh pr create --fill"), true);
    assert.equal(isShipping("Bash", "git status && git log"), false);
    assert.equal(isShipping("mcp__github__create_pull_request", ""), true);
    assert.equal(isShipping("Read", ""), false);
  });

  it("waits on work that will wake Claude, never on a background shell", () => {
    assert.equal(isWaitingOn([{ type: "shell" }]), false);
    assert.equal(isWaitingOn([{ type: "shell" }, { type: "subagent" }]), true);
    assert.equal(isWaitingOn([]), false);
  });

  it("lets a turn that ends on a question through", () => {
    assert.equal(isAsking("I can do A or B.\n\nWhich do you want?"), true);
    assert.equal(isAsking("Done. Is that a question? No."), false);
  });
});

describe("finding packages", () => {
  it("walks up from a file to the root", () => {
    assert.deepEqual(dirsUp("apps/web/src/page.tsx"), ["apps/web/src", "apps/web", "apps", ""]);
    assert.deepEqual(dirsUp("index.ts"), [""]);
  });

  it("reads a package.json, and nothing from a broken one", () => {
    assert.deepEqual(packageFrom("apps/web", '{"name":"@repo/web","scripts":{"dev":"next dev"}}'), {
      dir: "apps/web",
      name: "@repo/web",
      scripts: ["dev"],
    });
    assert.deepEqual(packageFrom("", "{}"), { dir: "", name: ".", scripts: [] });
    assert.equal(packageFrom("x", "{"), undefined);
    assert.equal(packageFrom("x", ""), undefined);
  });
});
