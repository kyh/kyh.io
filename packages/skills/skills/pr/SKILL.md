---
name: pr
description: Commit, push, open a PR, then watch it — address bot review comments (Claude, Cursor, Copilot, CodeRabbit, etc.) and failing checks, push fixes, and repeat until clean. On main, just commits and pushes. Pass a PR number or URL to skip straight to watching an existing PR.
disable-model-invocation: true
allowed-tools: Bash, Read, Edit, Write, Grep, Glob, Agent
---

# PR

Ship the current changes and babysit the PR until reviewers and checks are satisfied.

## Context

- Current branch: !git branch --show-current
- Current remote: !git remote -v | head -2
- Git status: !git status --short
- Diff: !git diff HEAD --stat

## Step 1: Ship

Skip to Step 2 if the user passed a PR number or URL.

- **Nothing to commit** → go to Step 2 with the branch's existing PR (`gh pr view --json number,url`); if there is none, say so and stop.
- **On main**: one commit with an appropriate message, push to main, done. There is no PR to watch.
- **On a branch**: one commit with an appropriate message, push with `-u`, then `gh pr create --fill` unless the branch already has a PR.

Never force push. Never amend a pushed commit. End commit messages with the attribution lines the harness gives.

## Step 2: Watch

Resolve the PR (`gh pr view <arg> --json number,url,headRefName`), then loop:

1. **Wait for checks**: run `gh pr checks <number> --watch --interval 30` in the background — you are re-invoked when it exits. If the PR has no checks, wait ~3 minutes instead so review bots have time to post.
2. **Collect feedback**:
   - Failing checks: `gh pr checks <number>`, then `gh run view <run-id> --log-failed` for the cause.
   - Unresolved review threads (query below) and top-level PR comments from bots: `[bot]` suffix or `type: "Bot"`, or known logins `claude`, `cursor`, `copilot`, `coderabbitai`, `sweep-ai`, `github-actions`.
   - Ignore deploy notices (Vercel, Netlify), CI status summaries, approvals, and threads that are resolved or outdated.
3. **Clean** (checks green, nothing actionable) → count a clean cycle.
4. **Otherwise** fix each item: read the referenced file and lines, apply a minimal fix, then one commit `fix: address review feedback` and push. Skip suggestions that conflict with project conventions or are wrong, and note why.

**Stop** after 2 consecutive clean cycles, or 10 cycles total. Report what was fixed, what was skipped and why, and the final check status. If the user messages mid-loop, pause and answer them.

## Commands

```bash
# Inline review comments / top-level comments
gh api repos/{owner}/{repo}/pulls/{number}/comments
gh api repos/{owner}/{repo}/issues/{number}/comments

# Review threads with resolution state
gh api graphql -f query='
  query($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        reviewThreads(first: 100) {
          nodes {
            isResolved
            isOutdated
            comments(first: 10) {
              nodes { author { login } body path line startLine }
            }
          }
        }
      }
    }
  }
' -F owner={owner} -F repo={repo} -F number={number}
```
