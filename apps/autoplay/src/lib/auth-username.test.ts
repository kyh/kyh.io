import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod";

import { auth } from "./auth";

/**
 * The X handle is the only thing tying a signed-in viewer to OWNER_X_USERNAME,
 * and it reaches the database solely through `mapProfileToUser`. better-auth's
 * `parseAdditionalUserInputFromProviderProfile` skips any additional field
 * marked `input: false`, so that flag does not restrict the field — it drops
 * the value outright, leaving `username` null while sign-in still reports
 * success. The owner check then silently fails and CH 01 never generates.
 *
 * Nothing else catches that: the column exists, the row is written, and the
 * only symptom is a channel that reruns forever.
 */

// Parsed rather than read directly: while the flag is absent the config's
// literal type has no `input` property, so naming it would not compile — and
// the day someone adds it back is exactly the day this has to still be looking.
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
