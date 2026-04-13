---
name: push
description: Commit and push changes. If on main, pushes directly. If on a branch, pushes and creates a PR. Use when you want to commit and ship changes.
disable-model-invocation: true
allowed-tools: Bash(git checkout --branch:*), Bash(git add:*), Bash(git status:*), Bash(git push:*), Bash(git commit:*), Bash(gh pr create:*)
---

# Push

Commit and push changes. Behavior depends on current branch.

## Context

- Current git status: !git status
- Current git diff (staged and unstaged changes): !git diff HEAD
- Current branch: !git branch --show-current

## Your task

Based on the above changes:

### If on main:

1. Create a single commit with an appropriate message
2. Push directly to main

### If on a branch:

1. Create a single commit with an appropriate message
2. Push the branch to origin
3. Create a pull request using gh pr create

You have the capability to call multiple tools in a single response. You MUST do all of the above in a single message. Do not use any other tools or do anything else. Do not send any other text or messages besides these tool calls.
