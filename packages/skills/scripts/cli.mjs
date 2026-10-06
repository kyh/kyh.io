#!/usr/bin/env node
import { check } from "./check.mjs";
import { install } from "./install.mjs";

const USAGE = `Usage: npx @kyh/skills@latest <command>

Commands:
  install [--dry-run]  Install or update skills, CLAUDE.md, and MCP servers
  check                Report drift between installed skills and external-skills.json

Env:
  KYH_SKILLS_NO_EXTERNAL=1   Skip external skill repos
  KYH_SKILLS_CONCURRENCY=N   Max repos installing at once (default: all)`;

const [command, ...flags] = process.argv.slice(2);

if (command === "install") {
  const ok = await install({ dry: flags.includes("--dry-run") });
  process.exitCode = ok ? 0 : 1;
} else if (command === "check") {
  process.exitCode = check() ? 0 : 1;
} else {
  console.log(USAGE);
  process.exitCode = command === undefined || command === "help" || command === "--help" ? 0 : 1;
}
