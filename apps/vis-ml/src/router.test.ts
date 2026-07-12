import assert from "node:assert/strict";
import test from "node:test";
import { matchRoutes } from "react-router-dom";

import { availableLessons, curriculum, defaultLesson, lessonPath } from "./curriculum";
import { routes } from "./router";

test("curriculum lesson numbers and slugs are unique", () => {
  const numbers = curriculum.map((lesson) => lesson.number);
  const slugs = availableLessons.map((lesson) => lesson.slug);

  assert.equal(new Set(numbers).size, numbers.length);
  assert.equal(new Set(slugs).size, slugs.length);
});

test("every available lesson has a route", () => {
  for (const lesson of availableLessons) {
    const path = lessonPath(lesson.slug);
    const matches = matchRoutes(routes, path);
    assert.equal(matches?.at(-1)?.route.path, path);
  }
});

test("lesson routes accept a trailing slash and unknown lessons use the 404 route", () => {
  const defaultLessonPath = lessonPath(defaultLesson.slug);
  const lessonMatches = matchRoutes(routes, `${defaultLessonPath}/`);
  assert.equal(lessonMatches?.at(-1)?.route.path, defaultLessonPath);

  const matches = matchRoutes(routes, "/lessons/unknown");
  assert.equal(matches?.at(-1)?.route.path, "*");
});
