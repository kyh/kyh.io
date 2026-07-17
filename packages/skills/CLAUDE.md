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
- **File naming: kebab-case for all TS/TSX files** (`game-scene.ts`, `use-game-state.ts`), including React components. Exceptions: tool-generated files with mandated names (e.g. `routeTree.gen.ts`)
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

## Picking the right models for workflows and subagents

Rankings, higher = better. Cost reflects what I actually pay (OpenAI has really generous limits), not list price. Intelligence is how hard a problem you can hand the model unsupervised. Taste covers UI/UX, code quality, API design, and copy.

| model    | cost | intelligence | taste |
|----------|------|--------------|-------|
| gpt-5.5  | 9    | 8            | 5     |
| sonnet-5 | 5    | 5            | 7     |
| opus-4.8 | 4    | 7            | 8     |
| fable-5  | 2    | 9            | 9     |

How to apply:
- These are defaults, not limits. You have standing permission to override them: if a cheaper model's output doesn't meet the bar, rerun or redo the work with a smarter model without asking. Judge the output, not the price tag. Escalating costs less than shipping mediocre work.
- Cost is a tie-breaker only; when axes conflict for anything that ships, intelligence > taste > cost.
- Bulk/mechanical work (clear-spec implementation, data analysis, migrations): gpt-5.5 — it's effectively free.
- Anything user-facing (UI, copy, API design) needs taste ≥ 7.
- Reviews of plans/implementations: fable-5 or opus-4.8, optionally gpt-5.5 as an extra independent perspective.
- Never use Haiku.
- Offload token-hungry work — computer use, whole-codebase reads/analysis, log or data crunching — to gpt-5.5 (or another model) and pull only the distilled result back into Fable's context. Keeps the orchestrator's window lean.
- Mechanics: gpt-5.5 is only reachable through the Codex CLI — `codex exec` / `codex review` (my ~/.codex/config.toml defaults to gpt-5.5). Use the codex-implementation, codex-review, and codex-computer-use skills; for work they don't cover (investigation, data analysis), run `codex exec -s read-only` directly with a self-contained prompt.
- Claude models (sonnet-5, opus-4.8, fable-5) run via the Agent/Workflow model parameter.

Steering gpt-5.5: it's extremely steerable but literal — it won't infer repo conventions or unstated constraints the way Claude does. Fable's job is to hand it an exhaustive, self-contained prompt: full context, explicit constraints, and the exact output shape wanted. A vague ask gets taste-5 output; a tight spec gets taste-8 work.

Using gpt-5.5 inside workflows and subagents (the model parameter only takes Claude models, so use a wrapper):
- Spawn a thin Claude wrapper agent with `model: 'sonnet', effort: 'low'` whose prompt instructs it to write a self-contained codex prompt, run `codex exec` via Bash, and return the raw stdout verbatim. The wrapper adds no judgment of its own — it's a courier: compose prompt → shell out → relay result. Fable does the thinking on both ends (the spec going in, the review coming out).
- Verify before shipping: gpt-5.5 is taste-5, so route anything user-facing it produces through a fable-5 or opus-4.8 review pass before it lands.
