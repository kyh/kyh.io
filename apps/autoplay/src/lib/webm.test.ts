import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  EBML_CLUSTER,
  EBML_DURATION,
  EBML_HEADER,
  EBML_INFO,
  EBML_SEGMENT,
  EBML_TIMECODE_SCALE,
  finalizeWebm,
  readVint,
} from "./webm";

// A stream the way MediaRecorder writes one — unknown-size Segment and
// Clusters, an Info with no Duration — built by hand, then finalized and
// read back.

const UNKNOWN_8 = [0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff];

const id = (value: number): number[] => {
  const out: number[] = [];
  let rest = value;
  while (rest > 0) {
    out.unshift(rest % 256);
    rest = Math.floor(rest / 256);
  }
  return out;
};

const element = (value: number, body: number[]): number[] => [
  ...id(value),
  0x80 | body.length,
  ...body,
];

const stream = (): Uint8Array<ArrayBuffer> =>
  new Uint8Array([
    ...element(EBML_HEADER, [0x42, 0x86, 0x81, 0x01]),
    ...id(EBML_SEGMENT),
    ...UNKNOWN_8,
    ...element(EBML_INFO, element(EBML_TIMECODE_SCALE, [0x0f, 0x42, 0x40])),
    ...element(0x1654ae6b, []),
    ...id(EBML_CLUSTER),
    ...UNKNOWN_8,
    ...element(0xe7, [0x00]),
    ...element(0xa3, [0x81, 0x00, 0x00, 0x80, 0x11, 0x22]),
    ...id(EBML_CLUSTER),
    ...UNKNOWN_8,
    ...element(0xe7, [0x07, 0xd0]),
    ...element(0xa3, [0x81, 0x00, 0x00, 0x80, 0x33]),
  ]);

type Found = { id: number; at: number; body: number; size: number; unknown: boolean };

/** Every element at one level, `from` to `to`, entering nothing. */
const elements = (bytes: Uint8Array, from: number, to: number): Found[] => {
  const found: Found[] = [];
  let cursor = from;
  while (cursor < to) {
    const elementId = readVint(bytes, cursor, true);
    const size =
      elementId === undefined ? undefined : readVint(bytes, cursor + elementId.length, false);
    if (elementId === undefined || size === undefined) break;
    const body = cursor + elementId.length + size.length;
    found.push({ id: elementId.value, at: cursor, body, size: size.value, unknown: size.unknown });
    cursor = size.unknown ? body : body + size.value;
  }
  return found;
};

describe("finalizeWebm", () => {
  it("fills in the segment and cluster sizes and writes the duration", () => {
    const input = stream();
    const output = finalizeWebm(input, 2.5);
    assert.equal(output.length, input.length + 11);

    const [header, segment] = elements(output, 0, output.length);
    assert.equal(header?.id, EBML_HEADER);
    assert.equal(segment?.id, EBML_SEGMENT);
    assert.equal(segment?.unknown, false);
    assert.equal(segment === undefined ? -1 : segment.body + segment.size, output.length);

    const children = segment === undefined ? [] : elements(output, segment.body, output.length);
    const info = children.find((child) => child.id === EBML_INFO);
    assert.ok(info !== undefined && !info.unknown);
    const clusters = children.filter((child) => child.id === EBML_CLUSTER);
    assert.equal(clusters.length, 2);
    assert.ok(clusters.every((cluster) => !cluster.unknown));
    assert.equal(
      clusters[0]?.body === undefined ? -1 : clusters[0].body + clusters[0].size,
      clusters[1]?.at,
    );
    assert.equal(
      clusters[1]?.body === undefined ? -1 : clusters[1].body + clusters[1].size,
      output.length,
    );

    const duration = elements(output, info.body, info.body + info.size).find(
      (child) => child.id === EBML_DURATION,
    );
    assert.ok(duration !== undefined);
    const view = new DataView(output.buffer, output.byteOffset + duration.body, 8);
    assert.equal(view.getFloat64(0), 2500);
  });

  it("leaves a stream it cannot read as it was", () => {
    const garbage = new Uint8Array([0x00, 0x01, 0x02]);
    assert.equal(finalizeWebm(garbage, 1), garbage);
  });
});
