import assert from "node:assert/strict";
import test from "node:test";

import type { CityProject } from "./draw-landmarks";
import { projects } from "@/lib/data";
import { SEASONS } from "@/seasons/seasons";
import { houseCells, parkOf } from "./draw-blocks";
import { planEntries } from "./draw-landmarks";
import { planCity } from "./plan";
import { DECOR, drawDecor, openSpots } from "./season-decor";
import { createSketch } from "./sketch";

const cityProjects: CityProject[] = projects.map((project) => ({
  description: project.description,
  favicon: project.favicon,
  kind: project.type,
  slug: project.slug,
  title: project.title,
  url: project.url,
}));

const plan = planCity(planEntries(cityProjects));

const decorated = (season: (typeof SEASONS)[number]["id"]) => {
  const sketch = createSketch();
  drawDecor(sketch, plan, season);
  return sketch;
};

test("every season but the default puts something out, and the default nothing", () => {
  for (const { id } of SEASONS) {
    const sketch = decorated(id);
    const drawn = sketch.faces.size + sketch.lines.size;
    assert.equal(drawn > 0, id !== "classic", id);
    assert.equal(Object.keys(DECOR[id]).length > 0, id !== "classic", id);
    // The default flies the site's own blimp.
    assert.equal(DECOR[id].blimp !== undefined, id !== "classic", id);
  }
});

test("a season's decorations are the same every time they're drawn", () => {
  const first = decorated("halloween");
  const again = decorated("halloween");
  assert.deepEqual([...first.faces], [...again.faces]);
  assert.deepEqual([...first.lines], [...again.lines]);
});

test("decorations draw whole triangles and segments, every number finite", () => {
  for (const { id } of SEASONS) {
    const sketch = decorated(id);
    for (const positions of sketch.faces.values()) {
      assert.equal(positions.length % 9, 0, id);
      assert.ok(positions.every(Number.isFinite), id);
    }
    for (const { positions } of sketch.lines.values()) {
      assert.equal(positions.length % 6, 0, id);
      assert.ok(positions.every(Number.isFinite), id);
    }
  }
});

test("each cottage gets a porch, and a garden's spot keeps clear of its tree and bush", () => {
  const spots = openSpots(plan);
  const houses = plan.blocks.filter((block) => block.use === "houses");
  const cells = houses.flatMap((block) => houseCells(block));
  assert.equal(spots.porch.length, cells.filter((cell) => "house" in cell).length);
  const lawns = cells.flatMap((cell) => ("tree" in cell ? [cell] : []));
  assert.equal(spots.yard.length, lawns.length);
  for (const [index, [x, z]] of spots.yard.entries()) {
    const lawn = lawns[index];
    assert.ok(lawn);
    assert.ok(Math.hypot(x - lawn.tree.x, z - lawn.tree.z) > 0.3, "under a tree");
    if (lawn.bush) {
      assert.ok(Math.hypot(x - lawn.bush[0], z - lawn.bush[1]) > 0.2, "in a bush");
    }
    assert.ok(
      x > lawn.lot.x &&
        x < lawn.lot.x + lawn.lot.w &&
        z > lawn.lot.z &&
        z < lawn.lot.z + lawn.lot.d,
    );
  }
});

test("the shore spots ring the pond, out of the water", () => {
  const ponds = plan.blocks.filter((block) => block.use === "park" && parkOf(block).style === 0);
  const spots = openSpots(plan);
  assert.equal(spots.shore.length, ponds.length * 8);
  for (const [x, z] of spots.shore) {
    const near = ponds
      .map((block) => parkOf(block).pond)
      .find((pond) => Math.hypot((x - pond.x) / pond.rx, (z - pond.z) / pond.rz) < 1.3);
    assert.ok(near, "by a pond");
    assert.ok(Math.hypot((x - near.x) / near.rx, (z - near.z) / near.rz) > 1, "in the water");
  }
});
