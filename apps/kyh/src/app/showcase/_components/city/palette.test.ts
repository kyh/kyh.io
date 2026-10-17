import assert from "node:assert/strict";
import test from "node:test";

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
  schemeAt,
  shade,
  timeOf,
} from "./palette";

const DAY: Scheme = { hue: null, light: 1 };
const NIGHT: Scheme = { hue: null, light: 0 };

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

test("the theme dial's hue turns the greys at any light", () => {
  for (const light of [0, 0.5, 1]) {
    const scheme: Scheme = { hue: 140, light };
    const [lightness, a, b] = oklab(shade("land", scheme, false));
    assert.ok(Math.abs((Math.atan2(b, a) * 180) / Math.PI - 140) < 3);
    assert.ok(Math.abs(lightness - oklab(greyOf(colorIn("land", scheme)))[0]) < 0.01);
  }
});

test("brightness mixes night into day, each end exactly the theme's own", () => {
  assert.equal(colorIn("land", DAY), PALETTE.land.day);
  assert.equal(colorIn("land", NIGHT), PALETTE.land.night);
  assert.equal(colorIn("ink", DAY), PALETTE.ink.day);
  assert.equal(colorIn("ink", NIGHT), PALETTE.ink.night);
  assert.equal(timeOf({ hue: null, light: 0.5 }), "day");
  assert.equal(timeOf({ hue: null, light: 0.49 }), "night");
});

test("the grounds skip the mid-greys at the flip, as the site's do", () => {
  const [day] = oklab(PALETTE.land.day);
  const [night] = oklab(PALETTE.land.night);
  const [justDay] = oklab(colorIn("land", { hue: null, light: 0.5 }));
  const [justNight] = oklab(colorIn("land", { hue: null, light: 0.49 }));
  const middle = (day + night) / 2;
  assert.ok(justDay > middle + 0.1);
  assert.ok(justNight < middle - 0.05);
});

test("ink keeps its distance from the ground at any brightness", () => {
  for (let light = 0; light <= 1; light += 0.05) {
    const scheme: Scheme = { hue: null, light };
    const [ground] = oklab(colorIn("land", scheme));
    const [ink] = oklab(colorIn("ink", scheme));
    assert.ok(Math.abs(ground - ink) > 0.4, `light ${light}`);
  }
});

test("a scheme is one object per light and hue", () => {
  assert.equal(schemeAt(0.3, null), schemeAt(0.3, null));
  assert.notEqual(schemeAt(0.3, null), schemeAt(0.3, 140));
});

const greyChroma = (light: number) => {
  const [, a, b] = oklab(shade("land", { hue: null, light }, false));
  return Math.hypot(a, b);
};

test("the slate tint comes in as the light goes", () => {
  assert.ok(greyChroma(1) < 0.005);
  assert.ok(greyChroma(0.5) > greyChroma(1));
  assert.ok(greyChroma(0) > greyChroma(0.5));
});

test("a scheme's colors are worked out once", () => {
  const scheme: Scheme = { hue: null, light: 0.3 };
  assert.equal(shade("roofBlue", scheme, false), shade("roofBlue", scheme, false));
  assert.equal(shade("roofBlue", { ...scheme }, false), shade("roofBlue", scheme, false));
});
