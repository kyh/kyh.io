import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PUBLIC_CHANNEL } from "./api-contract";
import type { ChannelSummary } from "./api-contract";
import { screenState, surfaceOf } from "./screen-state";

// The one value the chrome reads: which player runs, and what the picture,
// the badge and the overlays say about it.

const ownerLive: ChannelSummary = { ...PUBLIC_CHANNEL, mode: "live" };
const own: ChannelSummary = { kind: "rss", label: "Feed", mode: "live", number: 2, sourceId: "s1" };

describe("surfaceOf", () => {
  it("shows a visitor the public channel's record and its owner their own session", () => {
    assert.equal(surfaceOf(PUBLIC_CHANNEL, true, { status: "connecting" }), "replay");
    assert.equal(surfaceOf(ownerLive, true, { status: "connecting" }), "live");
  });

  it("falls the owner back to the record when the session is off air or fal is not there", () => {
    assert.equal(surfaceOf(ownerLive, true, { reason: "spent", status: "off-air" }), "replay");
    assert.equal(surfaceOf(ownerLive, false, { status: "connecting" }), "replay");
  });

  it("never shows a viewer's own channel as a replay", () => {
    assert.equal(surfaceOf(own, false, { reason: "dead", status: "off-air" }), "live");
  });
});

describe("screenState", () => {
  it("is tuning while either player loads", () => {
    assert.deepEqual(screenState("live", true, { status: "connecting" }, { status: "loading" }), {
      status: "tuning",
    });
    assert.deepEqual(screenState("replay", true, { status: "connecting" }, { status: "loading" }), {
      status: "tuning",
    });
  });

  it("is live on a picture, tailing when it is the owner's being recorded", () => {
    assert.deepEqual(screenState("live", true, { status: "live" }, { status: "loading" }), {
      status: "live",
      tailing: false,
    });
    assert.deepEqual(
      screenState("replay", true, { status: "connecting" }, { onAir: true, status: "playing" }),
      { status: "live", tailing: true },
    );
  });

  it("is a replay of the record otherwise, carrying why the owner is not live", () => {
    const replaying = { onAir: false, status: "playing" } as const;
    assert.deepEqual(screenState("replay", true, { status: "connecting" }, replaying), {
      liveDown: undefined,
      status: "replay",
    });
    assert.deepEqual(
      screenState("replay", true, { reason: "spent", status: "off-air" }, replaying),
      {
        liveDown: "spent",
        status: "replay",
      },
    );
  });

  it("says why when nothing can play, the live reason first", () => {
    const empty = { reason: "Nothing recorded yet.", status: "empty" } as const;
    assert.deepEqual(screenState("replay", true, { status: "connecting" }, empty), {
      reason: "Nothing recorded yet.",
      status: "off-air",
    });
    assert.deepEqual(screenState("replay", true, { reason: "Spent.", status: "off-air" }, empty), {
      reason: "Spent. Nothing recorded yet.",
      status: "off-air",
    });
    assert.deepEqual(screenState("live", true, { reason: "dead", status: "off-air" }, empty), {
      reason: "dead",
      status: "off-air",
    });
  });

  it("is off air without fal on a channel that needs a session", () => {
    const state = screenState("live", false, { status: "connecting" }, { status: "loading" });
    assert.equal(state.status, "off-air");
  });
});
