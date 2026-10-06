# mod-dev

A Claude Code mod. `/score` grades the work done in a session before it
merges, and the status line under the prompt keeps the evidence in view while
Claude works.

For example, after Claude was asked to add `subtract` and rename `add` to
`sum` without running the tests (the whys lightly trimmed):

> **not ready** · confidence 3 < 9 for high risk
>
> |            | score           | why                                                                                                                   |
> | ---------- | --------------- | --------------------------------------------------------------------------------------------------------------------- |
> | confidence | `███░░░░░░░` 3  | Nothing was checked after the step-1 edit, and no search ran for importers of `add`, so `math.test.js` may now break. |
> | idiomatic  | `████████░░` 8  | Pure arrow functions as the code requires; the test rule was skipped, but the user asked for no tests.                |
> | simplicity | `██████████` 10 | Two one-line changes to `math.js`, nothing extra.                                                                     |
> | scope      | `████████░░` 8  | `subtract` was added and `add` renamed, but the rename stops at `math.js`.                                            |
> | risk       | high            | Renaming the exported `add` to `sum` changes the module's public API and breaks every importer still using `add`.     |
>
> **Fixes**
>
> 1. Search the repo for imports of `add` from math.js (at least `math.test.js`) and update them to `sum`, or keep `add` as an alias.
> 2. Tell the user that `npm test` was skipped and that `math.test.js` may still reference `add`.
>
> verified: static – · test – · e2e – · against main (0a45f16) · graded by opus

It was right: `math.test.js` still imported `add`.

## What it checks

| Check      | The question                                              | Judged from                                                                        |
| ---------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| confidence | Could this merge now without breaking anything?           | The ledger: which checks ran, whether they passed, and whether after the last edit |
| idiomatic  | Does it follow this repo's conventions and written rules? | The diff, against `CLAUDE.md`, `AGENTS.md` and `REVIEW.md`                         |
| simplicity | Could a reviewer who never saw the session follow it?     | The diff                                                                           |
| scope      | Did it do what was asked, all of it and nothing else?     | Your prompts, and the files the session edited                                     |
| risk       | How bad is it if this is wrong? Low, medium or high.      | The diff                                                                           |

The first four score 0–10. Risk sets the bar for confidence: 7 for low, 8 for
medium, 9 for high. The other scores need 7. The verdict is **ready** when
every score clears its bar, **not ready** when any score is 4 or less, and
**fix first** in between.

## How it scores

**The evidence is mechanical.** The mod reads the session's own tool calls,
its subagents' included, into a ledger of edits and checks:

- Checks: typecheck, lint and format (`static`); tests (`test`); builds
  (`build`); driving the running app with a browser or a request to
  localhost, or loading a plugin into a real session (`e2e`). Read through package scripts, task runners and wrappers: `pnpm -F x
test`, `turbo run lint`, `npx vitest`, `agent-browser open
http://localhost:3000`.
- Edits: Edit and Write, and edits from the shell: `sed -i`, heredocs and
  redirects into the repository, inline scripts that write files, `git
checkout`, fixers like `--fix` and `--write`.
- A check counts only if it ran after the last edit. Its exit status decides
  whether it passed, unless a pipe or `|| true` hides it; then its output is
  read for a failure summary (`2 failed`, `error TS2322`, `ELIFECYCLE`).

**The grader is a separate model call with a fresh context.** It reads your
prompts, Claude's last reply (as claims to check), the ledger, the diff against
the default branch's merge base (uncommitted and untracked files included,
lockfiles left out of the patch) and the repo's instruction files. It never
sees the session's own reasoning, so it can't be talked into a good score, and
a claim the ledger doesn't back counts against the work.

## Requirements

- **Claude Code** with mod (function hooks plugin) support. Built and
  type-checked against 2.1.289.
- **git**. `/score` reads the change from it.

The mod has no npm dependencies at runtime.

## Install

From this repo:

```sh
pnpm dev:mod-dev
```

That runs `claude --plugin-dir apps/mod-dev`. To load it in every session,
add the folder to `CLAUDE_CODE_PLUGIN_DIRS` in the `env` block of
`~/.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_PLUGIN_DIRS": "~/code/kyh.io/apps/mod-dev"
  }
}
```

## Use it

| Command        | What it does                                                           |
| -------------- | ---------------------------------------------------------------------- |
| `/score`       | Grades everything since the merge base with `origin/HEAD` (or `main`). |
| `/score <ref>` | Grades everything since `<ref>`: `/score HEAD~3`, `/score v1.2.0`.     |

The scorecard lands in the transcript, so Claude reads it too: ask it to work
through the fixes, then `/score` again.

The status line shows where the checks stand for the code as it is now, once
something is edited: `verified: static ✓ · test stale · e2e –`. `✓` passed
after the last edit, `✗` failed after it, `stale` ran before it, `–` never ran.
Build shows once one has run.

Headless, `/score` is a gate: it exits 0 only when the verdict is ready.

```sh
claude -p --resume <session-id> --plugin-dir apps/mod-dev "/score"
```

### Settings

Open `/config` and find **mod-dev**:

| Setting      | Default | Options                   |
| ------------ | ------- | ------------------------- |
| Grader model | `opus`  | `opus`, `sonnet`, `haiku` |

## Cost

One model call per `/score`, on your plan or API key. What it reads is capped:
150,000 characters of patch (small files whole, large and generated ones cut),
40,000 of instruction files, the last 80 ledger steps.

## Limits

- Edits made outside Claude's tools, in your editor, aren't on the ledger. The
  diff still shows them, but a check that ran before them still reads as fresh.
- After a compaction the transcript holds less, so checks from before it drop
  off the ledger.
- Commands are recognized by name. A check under an unusual name shows as a
  command that ran; the grader still sees it.
- The grader is a model: read the scores as a second reviewer's opinion with
  reasons, not a measurement. The same change scored twice can move a point,
  or a risk level; the verdict and the reasons hold steadier than the numbers.

## Develop

```sh
pnpm -F @repo/mod-dev test       # node: the ledger, the grader's plumbing, the git script
pnpm -F @repo/mod-dev test:mod   # claude plugin test: the hooks against Claude Code itself
pnpm -F @repo/mod-dev typecheck  # pure modules + node tests, then the hooks against vendor/claude-code.d.ts
pnpm -F @repo/mod-dev validate   # what Claude Code will load
```

`claude plugin test` runs every `*.test.ts` in the mod in its own environment,
without Node, so the node tests are named `*.spec.ts`.

`vendor/claude-code.d.ts` is a copy of Claude Code's generated API types.
After a Claude Code update, replace it with the copy Claude Code writes to
`.claude-plugin/types/claude-code/index.d.ts` when it loads the mod.

| File                | Role                                                               |
| ------------------- | ------------------------------------------------------------------ |
| `hooks/register.ts` | The hooks: `/score`, the status line, reading the session          |
| `hooks/shell.ts`    | Command lines into commands and words: quotes, redirects, heredocs |
| `hooks/commands.ts` | What each command means: the checks it runs, whether it edits      |
| `hooks/evidence.ts` | The ledger of edits and checks, freshness, the status line         |
| `hooks/grade.ts`    | The rubric, the grader's prompt, reading its answer, the scorecard |
| `hooks/git.ts`      | The diff script                                                    |
