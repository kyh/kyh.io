import assert from "node:assert/strict";
import test from "node:test";

import type { CityProject } from "./draw-landmarks";
import { projects } from "@/lib/data";
import { drawBlock } from "./draw-blocks";
import { drawCountryside } from "./draw-countryside";
import { drawGround } from "./draw-ground";
import { drawLots, planEntries } from "./draw-landmarks";
import { ACCENTS, signature } from "./palette";
import { planCity } from "./plan";
import { createRandom } from "./random";
import { createSketch, faceAreas } from "./sketch";

const cityProjects: CityProject[] = projects.map((project) => ({
  description: project.description,
  favicon: project.favicon,
  kind: project.type,
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
  const { placed } = drawTown(cityProjects);
  for (const { bounds, project, sketch } of placed) {
    assert.ok(
      bounds.w > 0.5 && bounds.d > 0.5 && bounds.h > 0.3,
      `${project.title} is too small to pick`,
    );
    assert.ok(
      signsIn(sketch).includes(project.title.toUpperCase()),
      `${project.title} has no sign`,
    );
  }
});

test("each building is drawn on its own, so it can light up alone", () => {
  const { placed } = drawTown(cityProjects);
  for (const { project, sketch } of placed) {
    assert.ok(sketch.faces.size > 0, `${project.title} has no faces of its own`);
  }
});

test("each building glows in a color of its own when it's lit", () => {
  const { placed } = drawTown(cityProjects);
  const accents: readonly string[] = ACCENTS;
  const colors = placed.map(({ sketch }) => signature(faceAreas(sketch)));
  for (const [index, color] of colors.entries()) {
    assert.ok(accents.includes(color), `${placed[index]?.project.title} glows ${color}`);
  }
  assert.ok(new Set(colors).size >= 4, `only ${new Set(colors).size} colors across town`);
});

test("a project added tomorrow still gets a building with its name on it", () => {
  const newcomer: CityProject = {
    description: "Something new",
    favicon: "/assets/placeholder.png",
    kind: "mini-app",
    slug: "brand-new-thing",
    title: "Brand New Thing",
    url: "https://example.com",
  };
  const { placed } = drawTown([...cityProjects, newcomer]);
  const building = placed.find((entry) => entry.project.slug === newcomer.slug);
  assert.ok(building);
  assert.ok(signsIn(building.sketch).includes("BRAND NEW THING"));
});

test("the town draws as flat faces and ink, with nothing degenerate", () => {
  const { placed, sketch } = drawTown(cityProjects);
  let triangles = 0;
  const faces = [sketch, ...placed.map((entry) => entry.sketch)].flatMap((each) => [
    ...each.faces.values(),
  ]);
  for (const positions of faces) {
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
