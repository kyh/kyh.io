import assert from "node:assert/strict";
import test from "node:test";

import type { Site } from "./schedule";
import { crewPose, planCrews } from "./crews";

const site = (start: number, top: number | null, x = 10): Site => ({
  d: 2,
  kind: top === null ? "block" : "lot",
  start,
  top,
  w: 2,
  x,
  z: 10,
});

test("the tallest buildings get cranes, the other sites trucks", () => {
  const crews = planCrews({ sites: [site(1, 8), site(1.2, 2), site(1.4, null), site(1.6, 5)] });
  assert.deepEqual(
    crews.map((crew) => crew.kind),
    ["crane", "crane", "crane", "truck"],
  );
  assert.equal(crews[0]?.mast, 9);
});

test("a crane drives in, raises its mast while its building goes up, lowers it and drives off", () => {
  const [crane] = planCrews({ sites: [site(1, 4)] });
  assert.ok(crane);
  assert.equal(crewPose(crane, 0.1).shown, false);
  const arriving = crewPose(crane, 0.5);
  assert.ok(arriving.shown && arriving.x > crane.park.x);
  const working = crewPose(crane, (crane.start + crane.done) / 2);
  assert.equal(working.x, crane.park.x);
  assert.equal(working.mast, 1);
  const leaving = crewPose(crane, crane.done + 0.6);
  assert.ok(leaving.x < crane.park.x && leaving.mast === 0);
  assert.equal(crewPose(crane, crane.done + 2).shown, false);
});
