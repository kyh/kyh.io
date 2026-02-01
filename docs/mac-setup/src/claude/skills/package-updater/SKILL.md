---
name: package-updater
description: Update dependencies using taze.
disable-model-invocation: true
allowed-tools: Bash(pnpm:*), Bash(npm:*), Bash(yarn:*), Bash(bun:*), Bash(npx:*), Read, Glob
---

# Package Updater

Launch the Package Updater agent to update dependencies.

## Context

- Package manager lock files: !ls -la pnpm-lock.yaml package-lock.json yarn.lock bun.lockb 2>/dev/null || echo "No lock file found"
- Current package.json: !cat package.json 2>/dev/null | head -50

## Your task

Use the Task tool to launch the `package-updater` agent. It will use taze to check and update outdated packages, then verify the build.
