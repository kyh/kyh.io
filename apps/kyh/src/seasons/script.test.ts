import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

import { dateOf, dayOf } from "./calendar";
import type { Page } from "./paint";
import { barColor, paintTheme } from "./paint";
import { seasonScript } from "./script";
import type { Mode } from "./seasons";
import { seasonOf, seasonOn } from "./seasons";

// Just what painting touches of the page; the script sets numbers, as a page's style would take them.
const fakePage = () => {
  const properties = new Map<string, string>();
  const dataset: DOMStringMap = {};
  const page = {
    bar: { content: "" },
    root: {
      dataset,
      style: {
        removeProperty: (name: string) => {
          properties.delete(name);
          return "";
        },
        setProperty: (name: string, value: string | number | null) => {
          properties.set(name, String(value));
        },
      },
    },
  } satisfies Page;
  return { page, properties };
};

const FIRST = 2026;
const LAST = 2028;
const script = new vm.Script(seasonScript(FIRST, LAST));

/** What the visitor brings: the light or dark they kept, if any, and their system's. */
interface Visitor {
  kept: string | null;
  system: Mode;
}

const PLAIN: Visitor = { kept: null, system: "light" };

/** The page as the script leaves it, run on a day for a visitor; `barred` when it already has its meta. */
const scriptedOn = (key: number, { kept, system }: Visitor = PLAIN, barred = true) => {
  const { page, properties } = fakePage();
  const added: Page["bar"][] = [];
  const day = dateOf(key);
  // Only `new Date()`, today, is read.
  const Today = class extends Date {
    constructor() {
      super(day.getTime());
    }
  };
  script.runInNewContext({
    Date: Today,
    document: {
      createElement: () => page.bar,
      documentElement: page.root,
      head: { prepend: (meta: Page["bar"]) => added.push(meta) },
      querySelector: () => (barred ? page.bar : null),
    },
    localStorage: { getItem: () => kept },
    matchMedia: () => ({ matches: system === "dark" }),
  });
  return { added, bar: page.bar.content, dataset: page.root.dataset, properties };
};

/** The page as the store paints it for the calendar's season. */
const paintedOn = (key: number, mode: Mode) => {
  const { page, properties } = fakePage();
  const season = seasonOn(dateOf(key));
  paintTheme(page, season, seasonOf(season).mode ?? mode);
  return { added: [], bar: page.bar.content, dataset: page.root.dataset, properties };
};

test("before the page runs, the script paints every day as the store would", () => {
  const last = dayOf(LAST, 12, 31);
  const days = Array.from({ length: 366 * (LAST - FIRST + 1) }, (_, index) =>
    dayOf(FIRST, 1, 1 + index),
  ).filter((key) => key <= last);
  for (const key of days) {
    assert.deepEqual(scriptedOn(key), paintedOn(key, "light"), String(key));
  }
});

test("a holiday's tint and its own light or dark land on <html>; a plain day has neither", () => {
  const halloween = scriptedOn(dayOf(2026, 10, 28));
  assert.equal(halloween.dataset.season, "halloween");
  assert.equal(halloween.dataset.theme, "dark");
  assert.equal(halloween.properties.get("--season-hue"), "295");
  const plain = scriptedOn(dayOf(2026, 7, 4));
  assert.deepEqual(plain.dataset, { theme: "light" });
  assert.deepEqual([...plain.properties.keys()], ["color-scheme"]);
});

test("a plain day is the visitor's kept light or dark, else their system's", () => {
  const plain = dayOf(2026, 7, 4);
  assert.equal(scriptedOn(plain, { kept: "dark", system: "light" }).dataset.theme, "dark");
  assert.equal(scriptedOn(plain, { kept: null, system: "dark" }).dataset.theme, "dark");
  assert.equal(scriptedOn(plain, { kept: "system", system: "light" }).dataset.theme, "light");
  // A season's own light or dark wins over theirs.
  const easter = scriptedOn(dayOf(2026, 4, 5), { kept: "dark", system: "dark" });
  assert.equal(easter.dataset.theme, "light");
});

test("the browser's bar takes the page's background, its meta made if the page has none", () => {
  const halloween = scriptedOn(dayOf(2026, 10, 28));
  assert.equal(halloween.bar, barColor("dark", seasonOf("halloween").tint));
  const plain = dayOf(2026, 7, 4);
  assert.equal(scriptedOn(plain).bar, "#ffffff");
  assert.equal(scriptedOn(plain, { kept: "dark", system: "light" }).bar, "#000");
  const bare = scriptedOn(plain, PLAIN, false);
  assert.equal(bare.added.length, 1);
  assert.equal(bare.bar, "#ffffff");
});

test("the bar's colors are the page's own background, as global.css draws it", () => {
  const css = readFileSync(path.join(import.meta.dirname, "..", "styles", "global.css"), "utf-8");
  // The background is gray0 by light and gray1000 by dark…
  assert.ok(css.includes("--bg-highlighted: var(--colors-gray0);"));
  assert.ok(css.includes("--bg-highlighted: var(--colors-gray1000);"));
  // …in hex unturned, and in oklch as a season turns them.
  assert.ok(css.includes(`--colors-gray0: ${barColor("light", null)};`));
  assert.ok(css.includes(`--colors-gray1000: ${barColor("dark", null)};`));
  for (const [token, mode] of [
    ["gray0", "light"],
    ["gray1000", "dark"],
  ] as const) {
    const turned = /oklch\((?<lightness>\S+) (?<chroma>\S+) 0\)/u.exec(
      barColor(mode, { chroma: 1, hue: 0 }),
    )?.groups;
    assert.ok(turned, mode);
    const { chroma, lightness } = turned;
    assert.ok(
      css.includes(
        `--colors-${token}: oklch(${lightness} calc(${chroma} * var(--season-chroma)) var(--season-hue));`,
      ),
      token,
    );
  }
});
