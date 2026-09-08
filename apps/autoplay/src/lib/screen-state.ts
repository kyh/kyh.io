import type { ChannelSummary } from "@/lib/api-contract";
import { OWNER_SOURCE_ID } from "@/lib/source-kinds";

// What the TV shows, from the channel and what its two players report. The
// chrome reads its badge, its static, its overlays and its controls off one
// value, so a LIVE badge over static, or a replay badge on a live picture,
// cannot be built.

/**
 * "live" means a frame has reached the screen — not that the session is up.
 * The session reports itself live seconds before the first chunk arrives,
 * and a black screen with a LIVE badge reads as broken.
 */
export type LiveState =
  | { status: "connecting" }
  | { status: "live" }
  | { status: "off-air"; reason: string };

export type ReplayState =
  | { status: "loading" }
  | { status: "playing"; onAir: boolean }
  | { status: "empty"; reason: string };

/** Which player the screen runs: this browser's own session, or the channel's record. */
export type Surface = "live" | "replay";

/**
 * The public channel falls back to its record when its owner can't be live —
 * budget spent, grant expired, no fal — rather than going dark on them; every
 * other channel is its viewer's own session or nothing.
 */
export const surfaceOf = (channel: ChannelSummary, liveReady: boolean, live: LiveState): Surface =>
  channel.sourceId === OWNER_SOURCE_ID &&
  (channel.mode !== "live" || !liveReady || live.status === "off-air")
    ? "replay"
    : "live";

export type ScreenState =
  | { status: "tuning" }
  /** A picture is on screen: this browser's session, or the owner's followed as it records. */
  | { status: "live"; tailing: boolean }
  /** The record is playing; `liveDown` is why its owner is not live instead, when they should be. */
  | { status: "replay"; liveDown?: string }
  | { status: "off-air"; reason: string };

export const screenState = (
  surface: Surface,
  liveReady: boolean,
  live: LiveState,
  replay: ReplayState,
): ScreenState => {
  const liveDown = live.status === "off-air" ? live.reason : undefined;
  if (surface === "replay") {
    if (replay.status === "loading") {
      return { status: "tuning" };
    }
    if (replay.status === "empty") {
      return {
        reason: liveDown === undefined ? replay.reason : `${liveDown} ${replay.reason}`,
        status: "off-air",
      };
    }
    return replay.onAir ? { status: "live", tailing: true } : { liveDown, status: "replay" };
  }
  if (!liveReady) {
    return { reason: "The station can't go on air without fal.", status: "off-air" };
  }
  if (live.status === "connecting") {
    return { status: "tuning" };
  }
  if (live.status === "off-air") {
    return { reason: live.reason, status: "off-air" };
  }
  return { status: "live", tailing: false };
};
