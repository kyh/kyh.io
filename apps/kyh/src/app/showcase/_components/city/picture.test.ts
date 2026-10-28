import assert from "node:assert/strict";
import test from "node:test";

import { santaHat, witchHat } from "./hats";
import { PALETTE } from "./palette";
import { pictureOf } from "./picture";

test("a hat's picture frames its brim's middle and draws its faces and ink", () => {
  const { box, layers } = pictureOf(witchHat, "night");
  const [left, top, width, height] = box;
  assert.ok(left < 0 && left + width > 0 && top < 0 && top + height > 0);
  assert.ok(layers.some((layer) => layer.kind === "faces"));
  assert.ok(layers.some((layer) => layer.kind === "ink"));
});

test("a band round a crown goes on after the crown it wraps, and its ink after it", () => {
  const { layers } = pictureOf(witchHat, "night");
  const band = layers.findLastIndex(
    (layer) => layer.kind === "faces" && layer.fill === PALETTE.accentPurple.night,
  );
  const crown = layers.findIndex(
    (layer) => layer.kind === "faces" && layer.fill === PALETTE.screen.night,
  );
  assert.ok(crown !== -1 && band > crown);
  assert.ok(layers.slice(band).some((layer) => layer.kind === "ink"));
});

test("the cone through Santa's brim goes on after the brim's top", () => {
  const { layers } = pictureOf(santaHat, "day");
  const fills = layers.flatMap((layer) => (layer.kind === "faces" ? [layer.fill] : []));
  const red = new Set<string>([PALETTE.festiveRed.day, PALETTE.festiveRedShade.day]);
  assert.ok(fills.findLastIndex((fill) => red.has(fill)) > fills.indexOf(PALETTE.white.day));
});
