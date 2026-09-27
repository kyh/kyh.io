import assert from "node:assert/strict";
import test from "node:test";

import { siteRoutes } from "./config";
import { aboutContent, contactContent, privacyContent, prosePages } from "./page-content";

/** Visible text an extractor would count: prose, headings and link labels. */
const textLength = (page: (typeof prosePages)[number]) => {
  const blocks = page.sections.flatMap((section) => [
    section.heading,
    ...section.blocks.flatMap((block) => {
      if (block.kind === "links") {
        return block.items.flatMap((item) => [item.label, item.description]);
      }
      return [block.text];
    }),
  ]);

  return [page.heading, ...page.intro, ...blocks].join(" ").length;
};

test("the trust anchor pages clear the 500 character bar agents check", () => {
  for (const page of [aboutContent, contactContent, privacyContent]) {
    const length = textLength(page);
    assert.ok(length >= 500, `${page.path} has only ${length} characters`);
  }
});

test("every prose page has an h1, at least two h2s and at least one h3", () => {
  for (const page of prosePages) {
    assert.ok(page.heading.length > 0, `${page.path} has no h1`);
    assert.ok(page.sections.length >= 2, `${page.path} has fewer than two sections`);
  }

  // Heading depth is what the "flat heading structure" audit looks for; at least
  // one page-level subheading has to exist across the prose pages.
  const subheadings = prosePages.flatMap((page) =>
    page.sections.flatMap((section) =>
      section.blocks.filter((block) => block.kind === "subheading"),
    ),
  );
  assert.ok(subheadings.length >= 4, "prose pages need h3 subheadings");
});

test("every prose page is registered as a canonical route", () => {
  const paths = new Set(siteRoutes.map((route) => route.path));

  for (const page of prosePages) {
    assert.ok(paths.has(page.path), `${page.path} is not in siteRoutes`);
    assert.ok(page.description.length >= 50, `${page.path} has a thin meta description`);
  }
});

test("section ids are unique per page so anchor links resolve", () => {
  for (const page of prosePages) {
    const ids = page.sections.map((section) => section.id);
    assert.equal(new Set(ids).size, ids.length, `${page.path} has duplicate section ids`);
  }
});
