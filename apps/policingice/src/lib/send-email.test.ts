import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { emailModeOf, sendEmail } from "./send-email";

const FROM = "admin@example.com";

describe("emailModeOf", () => {
  it("sends through Resend once a key is set", () => {
    assert.deepEqual(emailModeOf({ EMAIL_FROM: FROM, RESEND_API_KEY: "re_key" }, true), {
      apiKey: "re_key",
      endpoint: "https://api.resend.com/emails",
      from: FROM,
      kind: "resend",
    });
  });

  it("logs the mail outside production without a key", () => {
    assert.deepEqual(emailModeOf({ EMAIL_FROM: FROM, RESEND_API_KEY: "" }, false), {
      kind: "log",
    });
  });

  it("sends nothing in production without a key", () => {
    assert.deepEqual(emailModeOf({ EMAIL_FROM: FROM, RESEND_API_KEY: undefined }, true), {
      kind: "off",
    });
  });
});

describe("sendEmail", () => {
  it("reports an unsent mail when email is off", async () => {
    assert.equal(
      await sendEmail({ subject: "Code", text: "123456", to: "a@example.com" }, { kind: "off" }),
      "off",
    );
  });
});
