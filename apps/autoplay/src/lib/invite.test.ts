import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { INVITE_COOKIE, inviteToken, invited } from "./invite";

// The invite is the only thing between a stranger with an X account and the
// station's fal budget, so the gate has to hold with the code and open
// without it — and never accept the code typed straight into the cookie.

describe("invite", () => {
  it("answers the right code, in any case, with a token and nothing else", () => {
    const token = inviteToken("sesame");
    assert.ok(token !== undefined);
    assert.equal(inviteToken("SESAME "), token);
    assert.equal(inviteToken("open sesame"), undefined);
    assert.equal(inviteToken(""), undefined);
    assert.notEqual(token, "sesame");
  });

  it("admits a browser carrying the token and nobody else", () => {
    const token = inviteToken("Sesame") ?? "";
    assert.equal(invited(`${INVITE_COOKIE}=${token}; other=1`), true);
    assert.equal(invited(`other=1; ${INVITE_COOKIE}=${encodeURIComponent(token)}`), true);
    assert.equal(invited(`${INVITE_COOKIE}=sesame`), false);
    assert.equal(invited(`${INVITE_COOKIE}=`), false);
    assert.equal(invited(undefined), false);
    assert.equal(invited(null), false);
  });
});
