import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

import { dateOf, dayOf } from "./calendar";
import type { Paintable } from "./paint";
import { paintTheme } from "./paint";
import { seasonScript } from "./script";
import type { Mode } from "./seasons";
import { seasonOf, seasonOn } from "./seasons";

// Just what painting touches of <html>; the script sets numbers, as a page's style would take them.
const fakeRoot = () => {
  const properties = new Map<string, string>();
  const dataset: DOMStringMap = {};
  const root = {
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
  } satisfies Paintable;
  return { properties, root };
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

/** <html> as the script leaves it, run on a day for a visitor. */
const scriptedOn = (key: number, { kept, system }: Visitor = PLAIN) => {
  const { properties, root } = fakeRoot();
  const day = dateOf(key);
  // Only `new Date()`, today, is read.
  const Today = class extends Date {
    constructor() {
      super(day.getTime());
    }
  };
  script.runInNewContext({
    Date: Today,
    document: { documentElement: root },
    localStorage: { getItem: () => kept },
    matchMedia: () => ({ matches: system === "dark" }),
  });
  return { dataset: root.dataset, properties };
};

/** <html> as the store paints it for the calendar's season. */
const paintedOn = (key: number, mode: Mode) => {
  const { properties, root } = fakeRoot();
  const season = seasonOn(dateOf(key));
  paintTheme(root, season, seasonOf(season).mode ?? mode);
  return { dataset: root.dataset, properties };
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
