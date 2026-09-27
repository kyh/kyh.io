import assert from "node:assert/strict";
import test from "node:test";

import { buildNotFoundProblem } from "./problem";

test("an unknown API path is an RFC 9457 404 that names the path", () => {
  const problem = buildNotFoundProblem("/api/users");

  assert.equal(problem.status, 404);
  assert.equal(problem.type, "about:blank");
  assert.equal(problem.title, "Not Found");
  assert.equal(problem.instance, "/api/users");
  assert.ok(problem.detail.includes("/openapi.json"));
});
