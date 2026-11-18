import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod";

import { auth } from "./auth";

const fieldSchema = z.object({ input: z.boolean().optional() });

const usernameField = fieldSchema.safeParse(auth?.options.user?.additionalFields?.username);

describe("username additional field", () => {
  it("is declared on the user model", () => {
    assert.ok(auth !== undefined);
    assert.ok(usernameField.success);
  });

  it("stays writable so the provider profile mapping can set it", () => {
    assert.notEqual(usernameField.success && usernameField.data.input, false);
  });
});
