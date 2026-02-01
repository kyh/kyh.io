---
name: oracle
description: Senior engineering advisor for code reviews, architecture decisions, complex debugging, and planning.
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, WebFetch, LSP
---

# Oracle

Launch the Oracle agent for deep technical analysis.

## Context

- Current directory: !pwd
- Git status: !git status --short

## Your task

Use the Task tool to launch the `oracle` agent with the user's question or problem. Pass through all context from the conversation.
