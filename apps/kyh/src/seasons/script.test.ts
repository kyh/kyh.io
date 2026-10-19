import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

import { dateOf, dayOf } from "./calendar";
import type { Paintable } from "./paint";
import { paintSeason } from "./paint";
import { seasonScript } from "./script";
import { seasonOn } from "./seasons";

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

/** <html> as the script leaves it, run on a day. */
const scriptedOn = (key: number) => {
  const { properties, root } = fakeRoot();
  const day = dateOf(key);
  // Only `new Date()`, today, is read.
  const Today = class extends Date {
    constructor() {
      super(day.getTime());
    }
  };
  script.runInNewContext({ Date: Today, document: { documentElement: root } });
  return { dataset: root.dataset, properties };
};

/** <html> as the store paints it for the calendar's season. */
const paintedOn = (key: number) => {
  const { properties, root } = fakeRoot();
  paintSeason(root, seasonOn(dateOf(key)));
  return { dataset: root.dataset, properties };
};

test("before the page runs, the script paints every day as the store would", () => {
  const last = dayOf(LAST, 12, 31);
  const days = Array.from({ length: 366 * (LAST - FIRST + 1) }, (_, index) =>
    dayOf(FIRST, 1, 1 + index),
  ).filter((key) => key <= last);
  for (const key of days) {
    assert.deepEqual(scriptedOn(key), paintedOn(key), String(key));
  }
});

test("a holiday's tint lands on <html>; a plain day leaves it alone", () => {
  const halloween = scriptedOn(dayOf(2026, 10, 28));
  assert.equal(halloween.dataset.season, "halloween");
  assert.equal(halloween.properties.get("--season-hue"), "295");
  const plain = scriptedOn(dayOf(2026, 7, 4));
  assert.deepEqual(plain.dataset, {});
  assert.equal(plain.properties.size, 0);
});
