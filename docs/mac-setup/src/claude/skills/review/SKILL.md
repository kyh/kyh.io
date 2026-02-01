---
name: review
description: Review code for quality, bugs, security, and best practices.
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Skill
---

# Review

Launch the Review agent for code review.

## Context

- Current git diff: !git diff HEAD
- Changed files: !git diff --name-only HEAD

## Your task

Use the Task tool to launch the `review` agent with the current changes. The agent will review for bugs, security issues, and code quality.
