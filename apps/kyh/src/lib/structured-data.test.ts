import assert from "node:assert/strict";
import test from "node:test";

import { absoluteUrl, siteConfig } from "./config";
import { buildStructuredData, serializeStructuredData } from "./structured-data";

const [person, organization, website] = buildStructuredData()["@graph"];

test("serialises to JSON that survives being inlined in a script tag", () => {
  const json = JSON.stringify(buildStructuredData());

  assert.deepEqual(JSON.parse(json), buildStructuredData());
  assert.ok(!json.includes("</script"), "JSON-LD would close its own script tag");
});

test("declares the identity types an agent resolves against", () => {
  assert.equal(buildStructuredData()["@context"], "https://schema.org");
  assert.equal(person["@type"], "Person");
  assert.equal(organization["@type"], "Organization");
  assert.equal(website["@type"], "WebSite");
});

test("the Person node carries name, description, url and profiles", () => {
  assert.equal(person.name, siteConfig.name);
  assert.equal(person.url, siteConfig.url);
  assert.ok(person.description.length > 20);
  assert.equal(person.sameAs.length, 4);
  assert.equal(person.jobTitle, "Technical Staff");
  assert.equal(person.worksFor.name, "Sequoia Capital");
});

test("the Organization node has a contactPoint and no postal address", () => {
  const [contactPoint] = organization.contactPoint;

  assert.equal(contactPoint?.["@type"], "ContactPoint");
  assert.equal(contactPoint?.email, siteConfig.email);
  assert.ok((contactPoint?.contactType.length ?? 0) > 0);
  assert.equal(contactPoint?.url, absoluteUrl("/contact"));

  assert.equal("address" in organization, false);
  assert.equal("address" in person, false);
});

test("nodes cross-reference each other by @id", () => {
  assert.equal(organization.founder["@id"], person["@id"]);
  assert.equal(website.publisher["@id"], organization["@id"]);
  assert.equal(website.about["@id"], person["@id"]);
});

test("serialization escapes < so the inline script can't be closed early", () => {
  const serialized = serializeStructuredData(buildStructuredData());

  assert.equal(serialized.includes("<"), false);
  assert.deepEqual(JSON.parse(serialized), buildStructuredData());
});
