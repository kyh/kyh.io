# mod-dev

A Claude Code mod that holds Claude to one rule: **never say a change is done
before it's proven.** Proven means checked after the last edit, run end to end
where it runs, and done the way this codebase and its libraries' installed docs
do it.

You don't call it. When Claude stops with an edited change, mod-dev checks the
proof and has a separate reviewer read the change. If something's missing,
Claude is sent back with what to do and where it says so. `/score` shows the
scorecard whenever you want it.

For example, Claude was asked to add `src/health.ts` and stopped without
running it. The gate sent it back:

> mod-dev: the reviewer says not ready (confidence 4 < 7 for low risk). Fix these, then check again:
>
> 1. Run `node --experimental-strip-types -e "import('./src/health.ts')…"` once approved and confirm it prints `ok` (ledger)
> 2. Add `src/health.test.ts` that asserts `health() === 'ok'`, so the `node --test` script actually exercises it (package.json:1)

Claude added the test, ran it, and said the import command still needed
approval, on a line of its own: `Unverified: e2e — …`. The reviewer read that,
accepted the reason, and let it stop.

## What it holds Claude to

| Proof            | How it's shown                                                      | Checked by                   |
| ---------------- | ------------------------------------------------------------------- | ---------------------------- |
| Verified         | Typecheck/lint and tests pass after the last edit                   | The ledger of tool calls     |
| End to end works | The change was driven for real: a browser, a request, a session     | The ledger                   |
| Idiomatic        | It follows the code around it and the repo's written rules          | The reviewer, with citations |
| Best practices   | Libraries used as their installed version documents; simple; scoped | The reviewer, with citations |

**Which checks a change needs** comes from the nearest `package.json` of each
edited file: `static` where it has a `typecheck`, `check`, `lint` or `tsc`
script, `test` where it has `test`, and `e2e` for a source file in a package
that runs (`dev`, `start`, `session` or `preview`). Docs and images need
nothing. Commands are spelled for the repo's package manager: `pnpm -F
@repo/kyh test`.

**A check counts for the packages it ran for.** A command aimed at a
package, by name (`pnpm -F @repo/kyh test`, `yarn workspace kyh test`) or by
directory (`cd apps/kyh && …`), counts for the packages it names, and for
none when it names another. One aimed at nothing, like a root `pnpm test`,
counts for all of them. When a change touches
two packages, each needs its own check, and the worst of them is what shows.

**When a check can't run here** (a production database, no test login, a
command that needs approval), Claude says so in its reply on a line of its
own:

```
Unverified: e2e — the route needs the production database
```

The gate stops asking for that check, and the reviewer weighs the reason: a
real constraint caps confidence at 8, an excuse counts as the check missing.

## The gates

**Stopping.** When Claude ends a turn with edits in the session:

1. Every needed check must have passed after the last edit, or be marked
   unverified. If not, Claude is sent back with the exact commands.
2. Then the reviewer reads the change. If it isn't ready, Claude is sent back
   with the reviewer's fixes, each with its source.

A turn that ends on a question to you passes. Claude is sent back at most 3
times per prompt; after that a toast says it's still not proven and the
decision is yours.

**Shipping.** `git push`, `gh pr create` and the GitHub MCP's pull request
tool are refused until the reviewer finds the change ready, or while a review
fails. You can still push it yourself.

**The bar.** At session start Claude is told the rule, including to find the
precedent before writing and to name what it followed. The review is mostly
confirmation when it does.

## The reviewer

Fresh model calls that never see the session's reasoning. The reviewer reads your
prompts, Claude's last reply (as claims to check), the ledger, the checks and
where they stand, the diff against the default branch's merge base
(uncommitted and untracked files included) and the CLAUDE.md, AGENTS.md and
REVIEW.md files.

**It looks before it judges, on two models.** A cheaper looker (Sonnet by
default) answers with `read:`, `grep:` and `list:` lines, up to 8 a round and
3 rounds. The mod runs them read-only, inside the repository (`git grep`,
file reads, directory listings). The looker is told to read the files beside
each change, code that does the same kind of thing, the installed version's
docs and types under `node_modules`, and whatever shows whether each e2e step
reached the changed code. Then the judge (Opus by default) scores the change
from the same material plus everything that was read, in one call. If looking
fails, the judge still runs, on less.

**An e2e step counts only if it reached the change.** A browser on another
page, or a request to another route, proves nothing about this change, and
the judge scores it that way.

**Every fix cites a source.** A file and line of precedent
(`src/lib/config.ts:40`), an instruction file (`CLAUDE.md`), a doc of the
installed version (`node_modules/next/dist/docs/…`), a URL, or `ledger` for a
missing check. A fix that cites nothing is dropped: the reviewer's taste
doesn't block Claude. Precedent decides style and structure; the installed
docs decide correctness and deprecations, even where the codebase does
otherwise.

| Score      | The question                                               |
| ---------- | ---------------------------------------------------------- |
| confidence | Could this merge now without breaking anything?            |
| idiomatic  | Does it do things the way this codebase already does them? |
| simplicity | Could a reviewer who never saw the session follow it?      |
| scope      | Did it do what was asked, all of it and nothing else?      |
| risk       | How bad is it if this is wrong? Low, medium or high.       |

The first four score 0–10. Risk sets the bar for confidence: 7 for low, 8 for
medium, 9 for high. The other scores need 7. The verdict is **ready** when
every score clears its bar, **not ready** when any score is 4 or less, and
**fix first** in between.

A ready change isn't reviewed again until the diff or its checks change. A
not-ready one is reviewed again once Claude answers it: a fix, or a reason the
finding is wrong.

## What you see

- **Above the prompt**, once something is edited: each needed check
  (`✓` passed, `✗` failed, `↺` ran before the last edit, `–` never ran, `?`
  unverified), the reviewer's verdict and its four scores, and `[Details]`.
- **The pane** (`[Details]` or `/score`): the verdict and why, each score as a
  bar with its reason, the checks with the commands that run them or the
  reason they can't, and the fixes with their sources.
- **The status line**: `verified: static ✓ · test ✓ · e2e – · ready`.

## Requirements

- **Claude Code** with mod (function hooks plugin) support, at or past the
  version `packages/claude-code-types` pins.
- **git**. The reviewer reads the change from it.

## Set up

The mod has no npm dependencies at runtime: loading it is pointing Claude Code
at this folder.

### One session

From this repo:

```sh
pnpm dev:mod-dev
```

That runs `claude --plugin-dir apps/mod-dev`. From anywhere else:

```sh
claude --plugin-dir /path/to/kyh.io/apps/mod-dev
```

### Every session

Add the folder to `CLAUDE_CODE_PLUGIN_DIRS` in the `env` block of
`~/.claude/settings.json` (an absolute path; `~` works). This is also how the
desktop app loads it, since it takes no flags.

```json
{
  "env": {
    "CLAUDE_CODE_PLUGIN_DIRS": "~/code/kyh.io/apps/mod-dev"
  }
}
```

Separate several folders with `:` (`;` on Windows). Claude Code reads this from
your user settings only, never a project's.

### Remove it

Drop the `--plugin-dir` flag, or the path from `CLAUDE_CODE_PLUGIN_DIRS`.

## Use it

Nothing to do: the gates run on their own.

| Command        | What it does                                                                                    |
| -------------- | ----------------------------------------------------------------------------------------------- |
| `/score`       | Reviews everything since the merge base with `origin/HEAD` (or `main`) now, and opens the pane. |
| `/score <ref>` | Reviews everything since `<ref>`: `/score HEAD~3`, `/score v1.2.0`.                             |

The scorecard lands in the transcript too, so Claude reads it.

Headless, `/score` is a gate: it exits 0 only when the verdict is ready.

```sh
claude -p --resume <session-id> --plugin-dir apps/mod-dev "/score"
```

### Settings

Open `/config` and find **mod-dev**:

| Setting              | Default  | Options                   |
| -------------------- | -------- | ------------------------- |
| Reviewer model       | `opus`   | `opus`, `sonnet`, `haiku` |
| Looking model        | `sonnet` | `opus`, `sonnet`, `haiku` |
| Hold Claude to proof | on       | on, off: `/score` only    |

## Cost

Model calls on your plan or API key, per review: up to 3 rounds of looking on
the looking model and one call to judge on the reviewer model. A ready change isn't reviewed again until it
changes. What the reviewer reads is capped: 150,000 characters of patch
(small files whole, large and generated ones cut), 40,000 of instruction
files, the last 80 ledger steps, and per look 200 lines, 60 matches or 80
entries.

## Limits

- Edits made outside Claude's tools, in your editor, aren't on the ledger. The
  diff still shows them, but a check that ran before them still reads as fresh.
- After a compaction the transcript holds less, so checks from before it drop
  off the ledger.
- Commands are recognized by name. A check under an unusual name shows as a
  command that ran; the reviewer still sees it.
- A check counts for a package by its command line. A check run from inside
  a package's directory, after a separate `cd`, names no package, so it
  counts for all of them.
- `e2e` is required for any source file of a package that runs, a pure
  helper's included. Claude can mark it unverified with a reason.
- The reviewer is a model: read the scores as a second reviewer's opinion with
  reasons, not a measurement. The same change scored twice can move a point,
  or a risk level; the verdict and the reasons hold steadier than the numbers.

## Troubleshooting

| Symptom                                 | Cause and fix                                                                             |
| --------------------------------------- | ----------------------------------------------------------------------------------------- |
| "Needs a git repository…"               | The session isn't in a git checkout. `/score` reads the change from git.                  |
| "Nothing to score: no changes against…" | The branch matches its base. Pass an older ref: `/score HEAD~1`.                          |
| "…'s answer did not fit the scorecard"  | The reviewer answered off-format. Run `/score` again, or pick another model.              |
| Claude keeps getting sent back          | After 3 times per prompt the gate lets go. Turn it off in `/config` to use `/score` only. |
| No band, no status line                 | The mod didn't load. Start with `claude --debug` and look for lines with `mod-dev:`.      |

## Develop

Claude Code watches a `--plugin-dir` folder in an interactive session: saving a
file in `hooks/` reloads the mod without a restart.

```sh
pnpm -F @repo/mod-dev test       # node: the ledger, needs and waivers, looks, the review loop, the board, git
pnpm -F @repo/mod-dev test:mod   # claude plugin test: the hooks: the gates, /score, the reviewer's looks, band, pane
pnpm -F @repo/mod-dev typecheck  # pure modules + node tests, then the hooks against the pinned API types
pnpm -F @repo/mod-dev validate   # what Claude Code will load
```

Tests come in two kinds, split by suffix. `test/*.spec.ts` cover the pure
modules under node and run in `pnpm test` and CI. `test/*.test.ts` run the
hooks inside Claude Code's own test kit, with the engine beneath mocked
(`claude-code/testing`); they need the `claude` CLI, so they're local only.
`claude plugin test` loads every `*.test.ts` in the folder, which is why the
node tests can't share the suffix.

The hooks type-check against `packages/claude-code-types`, the plugin API's
declarations pinned from the Claude Code version on that file's first line.
After a Claude Code update, refresh it from the copy the engine writes beside
a mod each time it loads one:

```sh
cp apps/mod-dev/.claude-plugin/types/claude-code/index.d.ts packages/claude-code-types/claude-code.d.ts
```

| File                 | Role                                                                                               |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| `hooks/register.tsx` | The hooks: the gates, `/score`, reading the session, band and pane layout                          |
| `hooks/proof.ts`     | What a change needs per package, which checks count for which, waivers, what the gate tells Claude |
| `hooks/review.ts`    | The review: the looker's rounds on one model, the judge on another                                 |
| `hooks/look.ts`      | The looker's reads: parsing them, keeping them in the repo, showing them                           |
| `hooks/board.ts`     | What the band, pane and status line show: signs, colors, score rows                                |
| `hooks/grade.ts`     | The rubric, the prompt, reading the answer and its sources, the scorecard                          |
| `hooks/evidence.ts`  | The ledger of edits and checks, freshness, the status line                                         |
| `hooks/commands.ts`  | What each command means: the checks it runs, whether it edits                                      |
| `hooks/shell.ts`     | Command lines into commands and words: quotes, redirects, heredocs                                 |
| `hooks/git.ts`       | The diff script, fingerprints                                                                      |
| `types/index.d.ts`   | The `$.state` contract: checks, the review, how often the gate sent Claude back                    |
