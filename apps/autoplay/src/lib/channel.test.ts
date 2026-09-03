import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEV_MAX_PLAYABLE_CLIPS, devCapReached, pendingFromRow } from "./channel";

// Working on the UI reloads the page constantly, and every reload asks the
// channel for a program. Without this a local session mints a paid clip every
// fifteen seconds while nobody is watching for content.

describe("devCapReached", () => {
  it("never applies in production, however full the channel is", () => {
    assert.equal(devCapReached(500, "production"), false);
  });

  it("stops local generation once the channel is full", () => {
    assert.equal(devCapReached(DEV_MAX_PLAYABLE_CLIPS, "development"), true);
    assert.equal(devCapReached(DEV_MAX_PLAYABLE_CLIPS + 3, "development"), true);
  });

  it("leaves room below the cap", () => {
    assert.equal(devCapReached(DEV_MAX_PLAYABLE_CLIPS - 1, "development"), false);
    assert.equal(devCapReached(0, "development"), false);
  });

  it("counts only what still airs, so archiving frees a slot", () => {
    // Five made, two archived in the guide -> three in rotation -> generate.
    assert.equal(devCapReached(3, "development"), false);
  });

  it("treats an unset NODE_ENV as local, erring towards not spending", () => {
    assert.equal(devCapReached(DEV_MAX_PLAYABLE_CLIPS, undefined), true);
  });
});

// The pending row is the channel's generation lock. Reading it wrong in either
// direction costs money: a row honoured too long stalls the channel, one
// dropped too soon lets a second request pay for the same post.

describe("pendingFromRow", () => {
  const now = 1_700_000_000_000;
  const postJson = JSON.stringify({
    id: "1",
    text: "hello",
    score: 1,
    author: { name: "A", username: "a" },
  });
  const submitted = {
    channelKey: "owner",
    requestId: "req-1",
    prompt: "p",
    postJson,
    createdAt: now,
  };

  it("keeps a submitted job for an hour, then treats it as lost", () => {
    assert.equal(
      pendingFromRow({ ...submitted, createdAt: now - 3_500_000 }, now)?.phase,
      "submitted",
    );
    assert.equal(pendingFromRow({ ...submitted, createdAt: now - 3_700_000 }, now), undefined);
  });

  it("keeps a claim only as long as submitting could plausibly take", () => {
    const claimed = { ...submitted, requestId: "" };
    assert.equal(pendingFromRow({ ...claimed, createdAt: now - 30_000 }, now)?.phase, "claimed");
    assert.equal(pendingFromRow({ ...claimed, createdAt: now - 61_000 }, now), undefined);
  });

  it("carries the request id only once the job reached fal", () => {
    const job = pendingFromRow(submitted, now);
    assert.equal(job?.phase === "submitted" ? job.requestId : undefined, "req-1");
  });

  it("treats a post that no longer parses as no job", () => {
    assert.equal(pendingFromRow({ ...submitted, postJson: "{" }, now), undefined);
    assert.equal(pendingFromRow({ ...submitted, postJson: "{}" }, now), undefined);
  });
});
