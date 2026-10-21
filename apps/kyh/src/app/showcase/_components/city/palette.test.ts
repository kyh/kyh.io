import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_THEME } from "@/themes";
import type { Scheme, Token } from "./palette";
import {
  colorIn,
  dominant,
  fromOklab,
  greyIn,
  greyOf,
  lookOf,
  oklab,
  PALETTE,
  shade,
} from "./palette";
import { schemeOf } from "./town-theme";

const DAY: Scheme = schemeOf({ theme: DEFAULT_THEME, time: "day" });
const NIGHT: Scheme = schemeOf({ theme: DEFAULT_THEME, time: "night" });

const hueOf = (hex: string) => {
  const [, a, b] = oklab(hex);
  return Math.atan2(b, a);
};

const hueGap = (from: string, to: string) => {
  const turn = hueOf(to) - hueOf(from);
  return Math.abs(Math.atan2(Math.sin(turn), Math.cos(turn)));
};

const areasOf = (entries: [Token, number][]) => new Map<Token, number>(entries);

test("OKLab round-trips every color in the palette", () => {
  for (const { day, night } of Object.values(PALETTE)) {
    assert.equal(fromOklab(oklab(day)), day);
    assert.equal(fromOklab(oklab(night)), night);
  }
});

test("a building's main color lands on its project's, lightness kept", () => {
  const { tint } = lookOf(areasOf([["roofBlue", 10]]), ["#de35df"]);
  const tinted = tint(PALETTE.roofBlue.day);
  assert.ok(hueGap(tinted, "#de35df") < 0.05);
  assert.ok(Math.abs(oklab(tinted)[0] - oklab(PALETTE.roofBlue.day)[0]) < 0.01);
});

test("each family of hues takes the icon's colors in turn", () => {
  const areas = areasOf([
    ["roofBlue", 10],
    ["roofBlueShade", 6],
    ["accentOrange", 2],
  ]);
  const { tint } = lookOf(areas, ["#77c5f1", "#e27337"]);
  assert.ok(hueGap(tint(PALETTE.roofBlue.day), "#77c5f1") < 0.05);
  assert.ok(hueGap(tint(PALETTE.accentOrange.day), "#e27337") < 0.05);
  assert.notEqual(tint(PALETTE.roofBlue.day), tint(PALETTE.roofBlueShade.day));
});

test("a one-color icon still leaves a building more than one hue", () => {
  const areas = areasOf([
    ["roofBlue", 10],
    ["accentOrange", 2],
  ]);
  const { tint } = lookOf(areas, ["#de35df"]);
  assert.ok(hueGap(tint(PALETTE.roofBlue.day), tint(PALETTE.accentOrange.day)) > 1);
});

test("greys stay grey and no colors leave the building as drawn", () => {
  const areas = areasOf([["roofBlue", 10]]);
  assert.equal(lookOf(areas, ["#de35df"]).tint(PALETTE.wallLeft.day), PALETTE.wallLeft.day);
  assert.equal(lookOf(areas).tint(PALETTE.roofBlue.day), PALETTE.roofBlue.day);
});

test("the main color is the colored token covering the most, greys aside", () => {
  const areas = areasOf([
    ["wallLeft", 100],
    ["navy", 10],
    ["accentYellow", 1],
  ]);
  assert.equal(dominant(areas), "navy");
  assert.equal(dominant(areasOf([["wallLeft", 100]])), null);
});

test("a glow shows on the ground by day and by night", () => {
  const areas = areasOf([["roofBlue", 10]]);
  assert.ok(oklab(lookOf(areas, ["#f8e778"]).glow.day)[0] <= 0.721);
  assert.ok(oklab(lookOf(areas, ["#1a2b50"]).glow.night)[0] >= 0.679);
  const [, a, b] = oklab(lookOf(areas).glow.day);
  assert.ok(Math.hypot(a, b) >= 0.099, "a pastel roof's glow isn't washed out");
});

test("a grey icon turns a building's colors to darker greys and leaves its greys", () => {
  const { tint } = lookOf(areasOf([["roofBlue", 10]]), ["#2b2d2e"]);
  const [lightness, a, b] = oklab(tint(PALETTE.roofBlue.day));
  assert.ok(Math.hypot(a, b) < 0.005, "still has a hue");
  assert.ok(lightness < oklab(PALETTE.roofBlue.day)[0], "not darkened");
  assert.equal(tint(PALETTE.wallRight.day), PALETTE.wallRight.day, "greyed a grey");
  const [, glowA, glowB] = oklab(lookOf(areasOf([["roofBlue", 10]]), ["#2b2d2e"]).glow.day);
  assert.ok(Math.hypot(glowA, glowB) < 0.005, "glows in a color");
});

test("a lit building's trees stay green and take none of its colors", () => {
  const areas = areasOf([
    ["tree", 100],
    ["roofBlue", 10],
  ]);
  const { tint } = lookOf(areas, ["#de35df", "#f1a50e"]);
  assert.equal(shade("tree", DAY, true, tint), PALETTE.tree.day);
  assert.ok(hueGap(tint(PALETTE.roofBlue.day), "#de35df") < 0.05, "a tree took the main color");
});

test("by night the greys are the site's slate, lightness kept", () => {
  const [lightness, a, b] = oklab(shade("sea", NIGHT, false));
  const [slateLightness, slateA, slateB] = oklab("#0f172a");
  assert.ok(Math.abs(lightness - slateLightness) < 0.03);
  assert.ok(Math.abs(Math.atan2(b, a) - Math.atan2(slateB, slateA)) < 0.2);
  assert.ok(Math.abs(oklab(greyIn("#888888", NIGHT))[0] - oklab("#888888")[0]) < 0.01);
  assert.equal(shade("sea", DAY, false), "#e7e7e7");
});

test("a theme's tint turns the greys by day and by night", () => {
  for (const time of ["day", "night"] as const) {
    const scheme: Scheme = schemeOf({ theme: "stPatricks", time });
    const [lightness, a, b] = oklab(shade("land", scheme, false));
    assert.ok(Math.abs((Math.atan2(b, a) * 180) / Math.PI - 140) < 3);
    assert.ok(Math.abs(lightness - oklab(greyOf(colorIn("land", scheme)))[0]) < 0.01);
  }
});

const chroma = (hex: string) => {
  const [, a, b] = oklab(hex);
  return Math.hypot(a, b);
};

test("the greys are plain by day and slate by night", () => {
  assert.ok(chroma(shade("land", DAY, false)) < 0.005);
  assert.ok(chroma(shade("land", NIGHT, false)) > 0.005);
});

test("a theme repaints its tokens and leaves the rest", () => {
  const christmas: Scheme = schemeOf({ theme: "christmas", time: "day" });
  assert.notEqual(colorIn("lawn", christmas), PALETTE.lawn.day, "no snow on the lawns");
  assert.notEqual(colorIn("roofBlue", christmas), PALETTE.roofBlue.day, "no snow on the roofs");
  assert.equal(shade("lawn", christmas, false), colorIn("lawn", christmas), "the snow was tinted");
  assert.equal(colorIn("ink", christmas), PALETTE.ink.day);
  assert.equal(colorIn("land", DAY), PALETTE.land.day);
  assert.equal(colorIn("land", NIGHT), PALETTE.land.night);
});

test("a theme's vivid tokens keep their color in the grey town", () => {
  const easter: Scheme = schemeOf({ theme: "easter", time: "day" });
  assert.equal(shade("roofPink", easter, false), PALETTE.roofPink.day);
  assert.notEqual(shade("roofPink", DAY, false), PALETTE.roofPink.day);
  assert.equal(shade("wallLeft", easter, false), greyIn(PALETTE.wallLeft.day, easter));
});

test("a scheme's colors are worked out once", () => {
  assert.equal(shade("roofBlue", NIGHT, false), shade("roofBlue", NIGHT, false));
});
