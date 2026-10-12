import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { drawsImages, frameUrl, lastWords, parseFrame, placementOf } from "../hooks/screen";
import { flipRows, frameSize, toCells } from "../stream/frame";

const HEADERS = {
  "x-coins": "3",
  "x-columns": "80",
  "x-frame": "12",
  "x-height": "400",
  "x-rows": "24",
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
      imagePath: "/var/folders/xy/T/mod-clawders-abc.rgba",
      socketPath: "/var/folders/xy/T/mod-clawders-abc.sock",
    });
    assert.equal(
      placementOf(`/${"d".repeat(120)}`, "abc").socketPath,
      "/tmp/mod-clawders-abc.sock",
    );
    assert.equal(placementOf(undefined, "abc").socketPath, "/tmp/mod-clawders-abc.sock");
  });

  it("draws pictures in kitty and Ghostty only", () => {
    assert.ok(drawsImages("xterm-kitty", ""));
    assert.ok(drawsImages("xterm-256color", "ghostty"));
    assert.ok(!drawsImages("xterm-256color", "Apple_Terminal"));
  });

  it("asks for a frame newer than the last", () => {
    assert.equal(
      frameUrl(4, "cells", 80, 24, { isActive: true, tokens: 1200 }),
      "http://clawders/frame?since=4&mode=cells&columns=80&rows=24&active=1&tokens=1200",
    );
  });

  it("reads a frame from headers, its cells from the body", () => {
    assert.deepEqual(parseFrame(HEADERS, ""), {
      coins: 3,
      columns: 80,
      frame: 12,
      height: 400,
      rows: 24,
      width: 560,
    });
    assert.equal(parseFrame(HEADERS, "AAAA")?.cells, "AAAA");
    assert.equal(parseFrame({ ...HEADERS, "x-frame": "nope" }, ""), null);
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
