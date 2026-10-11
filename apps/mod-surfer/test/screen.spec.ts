import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  drawsImages,
  effectsBetween,
  frameUrl,
  lastWords,
  parseFrame,
  placementOf,
} from "../hooks/screen";
import type { Frame } from "../hooks/screen";
import { flipRows, frameSize, toCells } from "../stream/frame";

const HEADERS = {
  "x-coins": "3",
  "x-columns": "80",
  "x-crashes": "1",
  "x-frame": "12",
  "x-height": "400",
  "x-jumps": "5",
  "x-rows": "24",
  "x-score": "1500",
  "x-width": "560",
};

// A bottom-up RGBA readback, as gl.readPixels gives it, from top-down rows.
const readback = (rows: number[][]) => {
  const width = rows[0]?.length ?? 0;
  const out = new Uint8Array(width * rows.length * 4);
  for (const [y, row] of rows.toReversed().entries()) {
    for (const [x, color] of row.entries()) {
      out.set(
        [Math.floor(color / 65_536), Math.floor(color / 256) % 256, color % 256, 255],
        (y * width + x) * 4,
      );
    }
  }
  return out;
};

describe("screen", () => {
  it("puts the socket in TMPDIR when the path fits, else /tmp", () => {
    assert.deepEqual(placementOf("/var/folders/xy/T/", "abc"), {
      imagePath: "/var/folders/xy/T/mod-surfer-abc.rgba",
      socketPath: "/var/folders/xy/T/mod-surfer-abc.sock",
    });
    assert.equal(placementOf(`/${"d".repeat(120)}`, "abc").socketPath, "/tmp/mod-surfer-abc.sock");
    assert.equal(placementOf(undefined, "abc").socketPath, "/tmp/mod-surfer-abc.sock");
  });

  it("draws pictures in kitty and Ghostty only", () => {
    assert.ok(drawsImages("xterm-kitty", ""));
    assert.ok(drawsImages("xterm-256color", "ghostty"));
    assert.ok(!drawsImages("xterm-256color", "Apple_Terminal"));
  });

  it("asks for a frame newer than the last", () => {
    assert.equal(
      frameUrl(4, "cells", 80, 24, true),
      "http://surfer/frame?since=4&mode=cells&columns=80&rows=24&active=1",
    );
  });

  it("reads a frame from headers, its cells from the body", () => {
    assert.deepEqual(parseFrame(HEADERS, ""), {
      coins: 3,
      columns: 80,
      crashes: 1,
      frame: 12,
      height: 400,
      jumps: 5,
      rows: 24,
      score: 1500,
      width: 560,
    });
    assert.equal(parseFrame(HEADERS, "AAAA")?.cells, "AAAA");
    assert.equal(parseFrame({ ...HEADERS, "x-frame": "nope" }, ""), null);
  });

  it("sounds what changed since the last frame, a crash over all else", () => {
    const base: Frame = {
      coins: 0,
      columns: 1,
      crashes: 0,
      frame: 10,
      height: 1,
      jumps: 0,
      rows: 1,
      score: 0,
      width: 1,
    };
    assert.deepEqual(effectsBetween(null, base, 0).effects, []);
    const later = { ...base, coins: 2, frame: 11, jumps: 1 };
    assert.deepEqual(effectsBetween(base, later, 0), {
      chimedAt: 11,
      effects: ["jump", "coin"],
    });
    assert.deepEqual(effectsBetween(later, { ...later, coins: 3, frame: 12 }, 11).effects, []);
    assert.deepEqual(effectsBetween(base, { ...later, crashes: 1 }, 0).effects, ["crash"]);
    assert.deepEqual(effectsBetween(later, { ...base, frame: 1 }, 11).effects, []);
  });

  it("keeps a process's last words", () => {
    assert.equal(lastWords("starting\nchrome: not found\n\n"), "chrome: not found");
  });
});

describe("frames", () => {
  it("sizes the render to the pane's shape, smaller for blocks", () => {
    const picture = frameSize(100, 30, "image");
    assert.equal(picture.width, 600);
    assert.ok(Math.abs(picture.width / picture.height - 100 / (30 * 2.1)) < 0.01);
    assert.equal(frameSize(100, 30, "cells").width, 400);
    assert.equal(frameSize(200, 60, "image").width, 640);
  });

  it("flips the readback top-down", () => {
    const rgba = flipRows(readback([[0xff_00_00], [0x00_00_ff]]), 1, 2);
    assert.deepEqual([...rgba], [255, 0, 0, 255, 0, 0, 255, 255]);
  });

  it("splits a cell into its two colors with a quadrant glyph", () => {
    const cells = toCells(
      readback([
        [0xff_ff_ff, 0xff_ff_ff],
        [0x00_00_00, 0x00_00_00],
      ]),
      2,
      2,
      1,
      1,
    );
    assert.deepEqual([...cells], [0x25_80, 0xff_ff_ff, 0x00_00_00]);
    const flat = toCells(
      readback([
        [0x12_34_56, 0x12_34_56],
        [0x12_34_56, 0x12_34_56],
      ]),
      2,
      2,
      1,
      1,
    );
    assert.deepEqual([...flat], [0x20, 0x12_34_56, 0x12_34_56]);
  });
});
