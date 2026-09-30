import assert from "node:assert/strict";
import test from "node:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { MarkdownPage } from "@/components/markdown-page";
import { renderPageMarkdown } from "@/lib/markdown";
import { aboutContent } from "@/lib/page-content";

const decodeEntities = (html: string) =>
  html
    .replaceAll("&#x27;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");

/** Block-level tags break lines, so each markdown block lines up with one element. */
const htmlText = (html: string) =>
  decodeEntities(
    html.replaceAll(/<\/(?:h[1-6]|p|li)>|<hr\/?>/gu, "\n").replaceAll(/<[^>]+>/gu, ""),
  );

const markdownText = (markdown: string) =>
  markdown
    .replaceAll(/^#{1,6} |^- |^---$/gmu, "")
    .replaceAll(/\[(?<label>[^\]]+)\]\([^)]+\)/gu, "$<label>")
    .replaceAll("`", "");

const lines = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

test("the /about HTML reads as the same text, in the same order, as its markdown", () => {
  const html = renderToStaticMarkup(createElement(MarkdownPage, { content: aboutContent }));

  assert.deepEqual(lines(htmlText(html)), lines(markdownText(renderPageMarkdown(aboutContent))));
});

test("the /about HTML keeps markdown's heading outline", () => {
  const html = renderToStaticMarkup(createElement(MarkdownPage, { content: aboutContent }));
  const markdown = renderPageMarkdown(aboutContent);

  for (const level of [1, 2, 3]) {
    const markdownCount = markdown.match(new RegExp(`^${"#".repeat(level)} `, "gmu"))?.length;
    const htmlCount = html.match(new RegExp(`<h${level}[ >]`, "gu"))?.length;
    assert.equal(htmlCount, markdownCount, `h${level} count differs`);
  }
});
