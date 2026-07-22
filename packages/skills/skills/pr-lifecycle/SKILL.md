---
name: pr-lifecycle
description: Monitor a PR for bot review comments (Claude, Cursor, Copilot, etc.), address all feedback, push fixes, and repeat until clean. Use when you want to babysit a PR through automated review cycles. Accepts optional PR number or URL as argument.
disable-model-invocation: false
allowed-tools: Bash, Read, Edit, Write, Grep, Glob, Agent, CronCreate, CronDelete, CronList
---

# PR Lifecycle Monitor

Continuously monitor a PR for bot reviewer comments, fix them, and push — repeating until the PR is clean.

## Context

- Current branch: !git branch --show-current
- Current remote: !git remote -v | head -2
- Git status: !git status --short

## Instructions

You are a PR lifecycle manager. Your job is to monitor a pull request for bot review comments (from Claude, Cursor, Copilot, CodeRabbit, Sweep, or similar AI reviewers), address every comment, push fixes, and repeat until no unresolved bot comments remain.

### Step 1: Identify the PR

If the user provided a PR number or URL as an argument, use that. Otherwise, detect the PR from the current branch:

```
gh pr view --json number,url,headRefName
```

If no PR is found, ask the user.

### Step 2: Set up the monitoring loop

Use CronCreate to schedule a check every 3 minutes:

The cron prompt should instruct Claude to:

1. **Fetch current bot comments** — use `gh api` to get all review comments and issue comments on the PR. Filter for bot authors by checking for common bot patterns:
   - Users with `[bot]` suffix or `type: "Bot"`
   - Known bot logins: `claude`, `cursor`, `copilot`, `coderabbitai`, `sweep-ai`, `github-actions`
   - Comments containing review suggestions (look for code suggestion blocks)

2. **Check for pending/in-progress checks** — use `gh pr checks` to see if any CI or bot checks are still running. If checks are still pending, log status and wait for next cycle.

3. **Identify unresolved comments** — a comment is unresolved if:
   - It's from a bot reviewer
   - It contains actionable feedback (not just a summary or approval)
   - It hasn't been resolved/outdated by a subsequent push
   - Filter out: deployment notifications (Vercel, Netlify), CI status comments, approval comments

4. **If no unresolved bot comments and all checks pass**: Report success and delete the cron job using CronDelete. Print a summary of what was fixed.

5. **If unresolved bot comments exist**: For each comment:
   - Read the referenced file and line range
   - Understand the feedback
   - Apply the fix (prefer minimal, surgical changes)
   - Stage the changed file

6. **After addressing all comments**: Create a single commit with message format:

   ```
   fix: address bot review feedback

   Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
   ```

   Then push to the PR branch.

7. **After pushing**: Log what was fixed and wait for the next cycle to verify the bots are satisfied.

### Useful commands

```bash
# Get all review comments (inline code comments)
gh api repos/{owner}/{repo}/pulls/{number}/comments

# Get all issue comments (top-level PR comments)
gh api repos/{owner}/{repo}/issues/{number}/comments

# Check PR status checks
gh pr checks {number} --repo {owner}/{repo}

# Get review threads to check resolution status
gh api graphql -f query='
  query($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        reviewThreads(first: 100) {
          nodes {
            isResolved
            isOutdated
            comments(first: 10) {
              nodes {
                author { login }
                body
                path
                line
                startLine
              }
            }
          }
        }
      }
    }
  }
'

# Push fixes
git add -A && git commit -m "fix: address bot review feedback" && git push
```

### Important behavior

- **Be patient**: After pushing, bots need time to re-review. Don't fix things that are already outdated.
- **Be surgical**: Only change what the bot asked for. Don't refactor surrounding code.
- **Be safe**: Never force push. Never amend commits that are already pushed.
- **Be smart**: If a bot suggestion conflicts with project conventions or is clearly wrong, skip it and note why.
- **Stop condition**: Delete the cron job after 2 consecutive clean cycles (no new bot comments) OR after 10 cycles total (safety limit). Report final status to user.
- **Respect the user**: If the user sends a message during monitoring, pause and respond to them.
