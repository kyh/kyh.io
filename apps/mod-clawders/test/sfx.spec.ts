import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { synthesizeEffects, toBase64, toWav } from "../hooks/sfx";

describe("sound effects", () => {
  it("encodes base64 as node does", () => {
    for (const length of [0, 1, 2, 3, 4, 5, 100]) {
      const bytes = Uint8Array.from({ length }, (_, i) => (i * 37) % 256);
      assert.equal(toBase64(bytes), Buffer.from(bytes).toString("base64"));
    }
  });

  it("writes a 16-bit mono WAV", () => {
    const wav = Buffer.from(toWav(Float32Array.of(0, 1, -1)));
    assert.equal(wav.toString("ascii", 0, 4), "RIFF");
    assert.equal(wav.toString("ascii", 8, 12), "WAVE");
    assert.equal(wav.readUInt16LE(22), 1);
    assert.equal(wav.readUInt16LE(34), 16);
    assert.equal(wav.readUInt32LE(40), 6);
    assert.deepEqual(
      [wav.readInt16LE(44), wav.readInt16LE(46), wav.readInt16LE(48)],
      [0, 32_767, -32_767],
    );
  });

  it("synthesizes every effect, short and within range", () => {
    for (const [name, base64] of Object.entries(synthesizeEffects())) {
      const wav = Buffer.from(base64, "base64");
      const seconds = wav.readUInt32LE(40) / 2 / 22_050;
      assert.ok(seconds > 0.1 && seconds < 0.6, `${name} lasts ${seconds}s`);
      let peak = 0;
      for (let i = 44; i < wav.length; i += 2) {
        peak = Math.max(peak, Math.abs(wav.readInt16LE(i)));
      }
      assert.ok(peak > 3000 && peak < 32_767, `${name} peaks at ${peak}`);
    }
  });
});
