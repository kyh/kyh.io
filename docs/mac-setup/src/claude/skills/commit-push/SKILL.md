---
name: commit-push
description: Commit and push directly to main. Use when you want to commit changes and push directly to the main branch.
disable-model-invocation: true
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git push:*), Bash(git commit:*)
---

# Commit and Push to Main

Commit changes and push directly to main branch.

## Context

- Current git status: !git status
- Current git diff (staged and unstaged changes): !git diff HEAD
- Current branch: !git branch --show-current

## Your task

Based on the above changes:

1. Create a single commit with an appropriate message
2. Push directly to main
3. You have the capability to call multiple tools in a single response. You MUST do all of the above in a single message. Do not use any other tools or do anything else. Do not send any other text or messages besides these tool calls.
