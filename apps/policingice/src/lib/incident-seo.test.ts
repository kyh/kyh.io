import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  incidentDescription,
  incidentJsonLd,
  incidentTitle,
  serializeJsonLd,
} from "./incident-seo";

const incident = {
  createdAt: new Date("2026-01-06T12:00:00Z"),
  description: "Agents   detained a man\noutside a hardware store.",
  id: 42,
  incidentDate: new Date("2026-01-05T12:00:00Z"),
  location: "Chicago, IL",
};

describe("incident SEO", () => {
  it("titles an incident by place and the day it happened", () => {
    assert.equal(incidentTitle(incident), "Incident in Chicago, IL · Jan 5, 2026");
    assert.equal(
      incidentTitle({ ...incident, incidentDate: null, location: null }),
      "Incident #42 · Jan 6, 2026",
    );
  });

  it("collapses whitespace and clips the description for a search snippet", () => {
    assert.equal(incidentDescription(incident), "Agents detained a man outside a hardware store.");
    const long = incidentDescription({ ...incident, description: "a".repeat(400) });
    assert.equal(long.length, 160);
    assert.ok(long.endsWith("…"));
    assert.ok(incidentDescription({ ...incident, description: null }).length > 0);
  });

  it("describes the page as an Article with a breadcrumb and no media", () => {
    const [article, breadcrumb] = incidentJsonLd(incident)["@graph"];
    assert.equal(article["@type"], "Article");
    assert.equal(article.url, "https://www.policingice.com/incident/42");
    assert.equal(breadcrumb["@type"], "BreadcrumbList");
    const json = JSON.stringify(incidentJsonLd(incident));
    assert.ok(!json.includes("image") && !json.includes("video"), "no footage in the graph");
  });

  it("escapes < so a description can't close the script tag", () => {
    const body = serializeJsonLd(incidentJsonLd({ ...incident, description: "</script>" }));
    assert.ok(!body.includes("<"));
  });
});
