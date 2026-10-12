// The page headless Chrome renders. Opened with `?stream`, each frame's
// pixels go to the streamer, whose answer says how big to draw, whether the
// run goes on and its tokens; opened plainly (`pnpm world`), it runs
// full-window with the distance as its score.
import { createView } from "./view";
import type { Frame } from "./view";

const IDLE_FRAME_MS = 250;
const params = new URLSearchParams(location.search);
const isStreamed = params.has("stream");

const view = createView({ sizesCanvas: !isStreamed });
document.body.append(view.canvas);
// Streamed, the world waits for the hooks to say a run is on.
let frame: Frame = {
  height: innerHeight,
  isActive: !isStreamed,
  isCoarse: params.has("coarse"),
  score: isStreamed ? 0 : "distance",
  width: innerWidth,
};
let pixels = new Uint8Array(0);
let isSending = false;

// Hands the frame just drawn to the streamer; its answer is the next frame.
const send = async () => {
  const { height, width } = frame;
  if (pixels.length !== width * height * 4) {
    pixels = new Uint8Array(width * height * 4);
  }
  view.gl.readPixels(0, 0, width, height, view.gl.RGBA, view.gl.UNSIGNED_BYTE, pixels);
  const counts = view.counts();
  const response = await fetch("/frame", {
    body: pixels,
    headers: {
      "x-coins": String(counts.coins),
      "x-crashes": String(counts.crashes),
      "x-height": String(height),
      "x-jumps": String(counts.jumps),
      "x-width": String(width),
    },
    method: "POST",
  });
  const nextWidth = Number(response.headers.get("x-width"));
  const nextHeight = Number(response.headers.get("x-height"));
  if (nextWidth > 0 && nextHeight > 0) {
    frame = {
      height: nextHeight,
      isActive: response.headers.get("x-active") === "1",
      isCoarse: response.headers.get("x-mode") === "cells",
      score: Number(response.headers.get("x-tokens")) || 0,
      width: nextWidth,
    };
  }
};

// One frame in flight at a time: drawing goes on while the streamer takes
// the last, and a frame drawn meanwhile is simply not sent. The pixels are
// read before the first await, so the buffer is never rewritten mid-send.
const sendOnce = async () => {
  isSending = true;
  try {
    await send();
  } catch {
    // The streamer is going away; the next frame tries again.
  } finally {
    isSending = false;
  }
};

const pause = (ms: number) =>
  // oxlint-disable-next-line promise/avoid-new -- a timer has no promise form
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

let last = performance.now();
const loop = async () => {
  const now = performance.now();
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (!isStreamed) {
    frame = { ...frame, height: innerHeight, width: innerWidth };
  }
  view.draw(frame, dt);
  if (isStreamed && !isSending) {
    void sendOnce();
  }
  if (isStreamed && !frame.isActive) {
    await pause(IDLE_FRAME_MS);
  }
  requestAnimationFrame(loop);
};

requestAnimationFrame(loop);
