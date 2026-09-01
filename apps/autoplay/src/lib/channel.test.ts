import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEV_MAX_PLAYABLE_CLIPS, devCapReached } from "./channel";

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
