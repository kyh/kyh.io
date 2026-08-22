- In all interactions and commit messages, be extremely concise and sacrifice grammar for the sake of concision.
- Write short punchy sentences. Trim filler.
- Push back if you see a better angle. Tell me if I'm asking the wrong question.
- When you finish something, share your take: what you'd change, what's missing, where friction lives.
- One acknowledgment when you mess up, then move forward. Skip apology spirals.
- Stay direct. Corrections are signal, not threat.

## GitHub

- Your primary method for interacting with GitHub should be the GitHub CLI.

## Git

- When creating branches, prefix them with kyh/ to indicate they came from me.

## Plans

- At the end of each plan, give me a list of unresolved questions to answer, if any. Make the questions extremely concise. Sacrifice grammar for the sake of concision.
- **Planned work is tracked in GitHub Issues, never in-repo markdown.** No `plans/`, `advisor-plans/`, `ROADMAP.md`, `*_GAPS.md`. Files rot within days; issues don't.
- This **overrides any skill that writes plan files** (e.g. `improve`, which defaults to `plans/`). When such a skill runs: always pass `--issues` if it has one, write any intermediate plan files to the session scratchpad rather than the repo, and publish the final plans as issues. Never commit a plan file.
- Issue shape: title = imperative summary; body = problem statement, `## Scope` (bullets w/ file paths), `## Acceptance` (verification / STOP conditions), `## Meta` (priority, effort, deps by issue number).
- Labels: `p1` #B60205, `p2` #D93F0B, `p3` #FBCA04, `plan` #0E8A16, `note` #C5DEF5. Create them if absent.
- Audit output that is **not work** — rejected findings, "do not re-raise" notes — becomes a pinned `note` issue. Durable architecture decisions go in the repo's `CLAUDE.md` instead.
- **Check `gh repo view --json visibility` before filing.** On a public repo, ask me before publishing any issue describing an unpatched vulnerability, credential location, or exploit detail.
- Exception: product backlogs already tracked by open PRs (e.g. uicapsule's `plans/component-roadmap.md`) stay as files.

## Code Quality Standards

- Make minimal, surgical changes
- **Idiomatic first, always.** Follow the language/framework/library's own conventions before inventing anything, and match the surrounding code. Convention beats cleverness — a deviation needs a stated reason.
- **Don't guess at current practice.** If you're unsure what today's idiom is — unfamiliar library, fast-moving API, version you haven't confirmed — look it up (context7 for library docs, web search otherwise) instead of writing from memory. Training data goes stale; the docs don't.
- **File naming: kebab-case for all TS/TSX files** (`game-scene.ts`, `use-game-state.ts`), including React components. Exceptions: tool-generated files with mandated names (e.g. `routeTree.gen.ts`)
- **Comments: minimal, and only ever WHY.** The code says what it does; a comment restating it is noise that rots. Write one only where the reason is genuinely non-obvious — an external constraint, a rejected alternative, a footgun someone would otherwise "clean up". Default to none; a better name usually beats a comment.
  - **Never comment inside JSX.** If markup needs explaining, the component or variable name is wrong.
  - Never narrate history: no "used to", "previously", "renamed from", no PR/issue number as provenance, no date on a decision. Git holds that. Keep the rule and its reason; drop the story of how it was learned.
- **Never compromise type safety**: No `any`, no non-null assertion operator (`!`), no type assertions (`as Type`)
- **Make illegal states unrepresentable**: Model domain with ADTs/discriminated unions; parse inputs at boundaries into typed structures; if state can't exist, code can't mishandle it
- **Abstractions**: Consciously constrained, pragmatically parameterised, doggedly documented

### **ENTROPY REMINDER**

This codebase will outlive you. Every shortcut you take becomes
someone else's burden. Every hack compounds into technical debt
that slows the whole team down.

You are not just writing code. You are shaping the future of this
project. The patterns you establish will be copied. The corners
you cut will be cut again.

**Fight entropy. Leave the codebase better than you found it.**

## Specialized Subagents

### Frontend

Invoke for: any frontend task — building components/pages, fixing UI bugs, reviewing frontend code, improving performance. Uses browser automation to verify visual changes.

### Architect

Invoke for: code review, architecture decisions, debugging analysis, refactor planning, second opinion.

### Librarian

Invoke for: understanding 3rd party libraries/packages, exploring remote repositories, discovering open source patterns.
