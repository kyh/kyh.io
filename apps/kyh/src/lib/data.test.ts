import assert from "node:assert/strict";
import test from "node:test";

import * as cli from "../../../cli/src/data/content";
import { projects, workHistory } from "./data";

// The CLI ships to npm on its own, so it can't import this file; it keeps a copy.
const withoutEmoji = (text: string) =>
  text
    .replaceAll(/\p{Extended_Pictographic}️?/gu, "")
    .replaceAll(/\s+/gu, " ")
    .trim();

test("the CLI lists the same projects, in the same order", () => {
  assert.deepEqual(
    cli.projects.map(({ title, description, url }) => ({ description, title, url })),
    projects.map(({ title, description, url }) => ({
      description: withoutEmoji(description),
      title,
      url,
    })),
  );
});

test("the CLI lists the same work history", () => {
  assert.deepEqual(
    cli.work.map(({ title, description, url }) => ({ description, title, url })),
    workHistory.map(({ company, role, link }) => ({
      description: role,
      title: company,
      url: link,
    })),
  );
});

test("every project has a unique slug and url", () => {
  assert.equal(new Set(projects.map((project) => project.slug)).size, projects.length);
  assert.equal(new Set(projects.map((project) => project.url)).size, projects.length);
});
