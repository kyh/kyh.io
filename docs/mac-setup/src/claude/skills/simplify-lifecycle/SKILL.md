---
name: simplify-lifecycle
description: Full architecture sweep that finds and fixes simplification opportunities in a loop until convergence. Analyzes the entire app structure, removes dead code, flattens unnecessary abstractions, consolidates duplicates, and simplifies over-engineered patterns. Loops until there's nothing left to improve. Use when you want to thoroughly clean up and simplify a codebase.
allowed-tools: Bash(*), Read, Edit, Write, Glob, Grep, Agent
---

# Deep Clean

Sweep the entire app architecture for simplification opportunities, fix them, and repeat until clean.

## Context

- Current directory: !pwd
- Project structure: !ls -la
- Package info: !cat package.json | head -20
- Git status: !git status --short
- CLAUDE.md conventions: !cat CLAUDE.md 2>/dev/null | head -50

## Process

### Phase 1: Explore

Use the Explore agent to build a full picture of the codebase. Map out:
- Directory structure and module boundaries
- Key abstractions and how they connect
- Data flow patterns
- Shared code and duplication

### Phase 2: Identify

Find simplification opportunities across these categories, ordered by impact:

1. **Dead code**: Unused exports, unreachable branches, stale feature flags, orphaned files, unused dependencies
2. **Unnecessary abstraction**: Wrappers that just pass through, single-use utilities, over-parameterized helpers, premature generalization
3. **Duplication**: Copy-pasted logic that should be shared, near-identical components, repeated patterns that could be one function
4. **Over-engineering**: Complex state management for simple state, unnecessary indirection layers, config-driven code that only has one config, DI/IoC where direct imports work
5. **Stale patterns**: Old conventions that don't match current project standards, mixed paradigms (e.g., class + functional), inconsistent error handling styles
6. **Dependency bloat**: Libraries used for trivial functionality, redundant deps that overlap, deps that could be replaced with built-ins

### Phase 3: Propose

Present findings as a numbered list, grouped by category. For each item:
- **What**: The specific file(s) and code
- **Why**: Why it's unnecessary or overly complex
- **Fix**: The concrete simplification (delete, inline, merge, replace)
- **Risk**: Low/medium — skip anything high-risk

Do NOT include items where the "fix" is just adding comments or docs. Every item must result in less code or fewer files.

Ask: "Fix all? Or pick specific items?"

### Phase 4: Fix

Apply each fix:
1. Make the change
2. Verify the build still passes (`pnpm build` or equivalent)
3. If build breaks, revert and skip that item
4. Mark complete

After all fixes are applied, commit with: `chore: deep clean — [summary of biggest changes]`

### Phase 5: Loop

Go back to Phase 2. Explore again — previous simplifications often unlock new ones (e.g., removing an abstraction may reveal the thing it wrapped is now dead code too).

Keep looping until Phase 2 finds **zero actionable items**.

When converged, output a final summary:
```
Deep Clean Complete
-------------------
Passes:       N
Items fixed:  N
Files deleted: N
Lines removed: ~N
Commits:      [list]
```

## Rules

- NEVER change behavior. Every simplification must be a pure refactor.
- NEVER delete test files unless the code they test was deleted.
- NEVER simplify code that's intentionally verbose for readability (e.g., explicit type annotations, named intermediate variables).
- Prefer deleting code over rewriting it. The best simplification is removal.
- Run the build after EVERY change, not in batches. One broken change should not block others.
- If the user passed a specific directory or scope, constrain exploration to that scope.
- Respect CLAUDE.md conventions — don't "simplify" things into patterns the project forbids.
