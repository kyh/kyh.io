import assert from "node:assert/strict";
import test from "node:test";

import type { Block, Lot } from "./plan";
import { createSchedule, LEAD, RISE } from "./schedule";

const block = (x: number, z: number): Block => ({
  bx: 0,
  bz: 0,
  d: 6,
  ring: 0,
  seed: 1,
  use: "offices",
  w: 6,
  x,
  z,
});
const lot = (slug: string, x: number, z: number): Lot => ({ d: 2, size: "half", slug, w: 2, x, z });

const PLAN = {
  blocks: [block(33, 33), block(60, 60)],
  lots: [lot("tower", 34, 34)],
};

test("a building keeps its own start inside its block; the countryside follows by distance", () => {
  const schedule = createSchedule(PLAN, new Map([["tower", 6]]));
  const tower = schedule.startAt(35, 35);
  const street = schedule.startAt(38, 38);
  assert.notEqual(tower, street);
  assert.equal(schedule.startAt(34.1, 35.9), tower);
  assert.ok(schedule.startAt(5, 5) >= LEAD);
});

test("work starts once the machines are in, from the middle out, and ends after the tallest is up", () => {
  const schedule = createSchedule(PLAN, new Map([["tower", 6]]));
  const starts = schedule.sites.map((site) => site.start);
  assert.ok(Math.min(...starts) >= LEAD);
  assert.deepEqual(
    starts,
    starts.toSorted((a, b) => a - b),
  );
  assert.ok(schedule.startAt(35, 35) < schedule.startAt(62, 62));
  assert.ok(schedule.end >= Math.max(...starts) + 6 / RISE);
});
