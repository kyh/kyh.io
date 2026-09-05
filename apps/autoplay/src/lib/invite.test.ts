import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  INVITE_COOKIE,
  generateInviteCode,
  inviteCookieValue,
  inviteFromCookie,
  isWellFormedInviteCode,
  normalizeInviteCode,
} from "./invite";

// The invite cookie is the only thing between a stranger with an X account
// and the station's fal budget: it must name a code only with the secret's
// signature, and a code has to read back exactly as it was minted.

describe("invite codes", () => {
  it("are six letters or digits, whatever case they were typed in", () => {
    assert.equal(normalizeInviteCode(" vickie "), "VICKIE");
    assert.equal(isWellFormedInviteCode("VICKIE"), true);
    assert.equal(isWellFormedInviteCode("VICK-E"), false);
    assert.equal(isWellFormedInviteCode("VICKI"), false);
    assert.equal(isWellFormedInviteCode("vickie"), false);
    for (let i = 0; i < 50; i += 1)
      assert.equal(isWellFormedInviteCode(generateInviteCode()), true);
  });
});

describe("invite cookie", () => {
  it("names the code and reads it back only with the right signature", () => {
    const value = inviteCookieValue("VICKIE");
    assert.ok(value !== undefined);
    assert.equal(inviteFromCookie(`${INVITE_COOKIE}=${value}; other=1`), "VICKIE");
    assert.equal(
      inviteFromCookie(`other=1; ${INVITE_COOKIE}=${encodeURIComponent(value)}`),
      "VICKIE",
    );
    assert.equal(inviteFromCookie(`${INVITE_COOKIE}=VICKIE`), undefined);
    assert.equal(inviteFromCookie(`${INVITE_COOKIE}=VICKIE.forged`), undefined);
    assert.equal(
      inviteFromCookie(`${INVITE_COOKIE}=${value.replace("VICKIE", "SESAME")}`),
      undefined,
    );
    assert.equal(inviteFromCookie(undefined), undefined);
  });
});
