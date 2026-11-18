import { createView } from "./view";
import type { Frame } from "./view";

const IDLE_FRAME_MS = 250;
const params = new URLSearchParams(location.search);
const isStreamed = params.has("stream");

const view = createView({ sizesCanvas: !isStreamed });

document.body.append(view.canvas);

let frame: Frame = {
  height: innerHeight,
  isActive: !isStreamed,
  isCoarse: params.has("coarse"),
  score: isStreamed ? 0 : "distance",
  width: innerWidth,
};

let pixels = new Uint8Array(0);
let isSending = false;

const send = async () => {
  const { height, width } = frame;

  if (pixels.length !== width * height * 4) {
    pixels = new Uint8Array(width * height * 4);
  }

  view.gl.readPixels(0, 0, width, height, view.gl.RGBA, view.gl.UNSIGNED_BYTE, pixels);

  const response = await fetch("/frame", {
    body: pixels,
    headers: {
      "x-coins": String(view.coins()),
      "x-height": String(height),
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

const sendOnce = async () => {
  isSending = true;

  try {
    await send();
  } catch {
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
