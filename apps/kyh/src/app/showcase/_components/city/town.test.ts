import assert from "node:assert/strict";
import test from "node:test";

import type { CityProject } from "./draw-landmarks";
import { projects } from "@/lib/data";
import { drawBlock } from "./draw-blocks";
import { drawCountryside } from "./draw-countryside";
import { drawGround } from "./draw-ground";
import { drawLots, planEntries } from "./draw-landmarks";
import { planCity } from "./plan";
import { createRandom } from "./random";
import { createSketch } from "./sketch";

const cityProjects: CityProject[] = projects.map((project) => ({
  description: project.description,
  favicon: project.favicon,
  kind: project.type,
  media: null,
  slug: project.slug,
  title: project.title,
  url: project.url,
}));

const drawTown = (list: CityProject[]) => {
  const plan = planCity(planEntries(list));
  const sketch = createSketch();
  drawGround(sketch, plan, createRandom(11));
  drawCountryside(sketch, plan);
  for (const block of plan.blocks) {
    drawBlock(sketch, block);
  }
  return { placed: drawLots(sketch, plan, list), sketch };
};

const signsIn = (sketch: ReturnType<typeof createSketch>): string[] => [
  ...sketch.signs.map((sign) => sign.text),
  ...sketch.parts.flatMap((piece) => signsIn(piece.sketch)),
];

test("every project on the site has a building in town", () => {
  const { placed } = drawTown(cityProjects);
  const slugs = new Set(placed.map((entry) => entry.project.slug));
  for (const project of cityProjects) {
    assert.ok(slugs.has(project.slug), `${project.title} has no building`);
  }
});

test("every building is tall enough to click and carries its project's name", () => {
  const { placed, sketch } = drawTown(cityProjects);
  const signs = signsIn(sketch);
  for (const { bounds, project } of placed) {
    assert.ok(
      bounds.w > 0.5 && bounds.d > 0.5 && bounds.h > 0.3,
      `${project.title} is too small to pick`,
    );
    assert.ok(signs.includes(project.title.toUpperCase()), `${project.title} has no sign`);
  }
});

test("a project added tomorrow still gets a building with its name on it", () => {
  const newcomer: CityProject = {
    description: "Something new",
    favicon: "/assets/placeholder.png",
    kind: "mini-app",
    media: null,
    slug: "brand-new-thing",
    title: "Brand New Thing",
    url: "https://example.com",
  };
  const { placed, sketch } = drawTown([...cityProjects, newcomer]);
  assert.ok(placed.some((entry) => entry.project.slug === newcomer.slug));
  assert.ok(signsIn(sketch).includes("BRAND NEW THING"));
});

test("the town draws as flat faces and ink, with nothing degenerate", () => {
  const { sketch } = drawTown(cityProjects);
  let triangles = 0;
  for (const positions of sketch.faces.values()) {
    assert.equal(positions.length % 9, 0);
    assert.ok(positions.every(Number.isFinite));
    triangles += positions.length / 9;
  }
  for (const batch of sketch.lines.values()) {
    assert.equal(batch.positions.length % 6, 0);
    assert.ok(batch.positions.every(Number.isFinite));
  }
  assert.ok(triangles > 10_000);
});
