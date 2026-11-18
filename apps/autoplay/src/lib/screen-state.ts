import type { ChannelSummary } from "@/lib/api-contract";
import { OWNER_SOURCE_ID } from "@/lib/source-kinds";

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
export const surfaceOf = (channel: ChannelSummary, liveReady: boolean, live: LiveState) =>
  channel.sourceId === OWNER_SOURCE_ID &&
  (channel.mode !== "live" || !liveReady || live.status === "off-air")
    ? "replay"
    : "live";

export type ScreenState =
  | { status: "tuning" }
  | { status: "live"; tailing: boolean }
  | { status: "replay"; liveDown?: string }
  | { status: "off-air"; reason: string };

export const screenState = (
  surface: Surface,
  liveReady: boolean,
  live: LiveState,
  replay: ReplayState,
) => {
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
