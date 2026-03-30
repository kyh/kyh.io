---
name: architect
description: Senior engineering advisor for code reviews, architecture decisions, complex debugging, and planning.
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, WebFetch, LSP
---

# Architect

Launch the Architect agent for deep technical analysis.

## Context

- Current directory: !pwd
- Git status: !git status --short

## Your task

Use the Task tool to launch the `architect` agent with the user's question or problem. Pass through all context from the conversation.
