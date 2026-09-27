import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { absoluteUrl, agentRoutes, siteConfig } from "./config";
import {
  API_CATALOG_PATH,
  OPENAPI_PATH,
  buildApiCatalog,
  buildOpenApiDocument,
  discoveryLinks,
} from "./openapi";

const appDir = path.join(import.meta.dirname, "..", "app");

/** Where Next serves each documented path from; anything unmapped is an invented endpoint. */
const routeFile = (route: string) => {
  if (route === "/") {
    return path.join(appDir, "(home)", "page.tsx");
  }
  if (route === "/sitemap.xml") {
    return path.join(appDir, "sitemap.ts");
  }
  return path.join(appDir, ...route.split("/"), "route.ts");
};

test("is an OpenAPI 3.1 document served from the canonical origin", () => {
  const doc = buildOpenApiDocument();

  assert.equal(doc.openapi, "3.1.0");
  assert.deepEqual(doc.servers, [{ url: siteConfig.url }]);
  assert.equal(doc.info.contact.email, siteConfig.email);
});

test("documents exactly the homepage and the advertised machine-readable routes", () => {
  const documented = Object.keys(buildOpenApiDocument().paths).toSorted();
  const advertised = ["/", ...agentRoutes.map((route) => route.path)].toSorted();

  assert.deepEqual(documented, advertised);
  assert.ok(documented.includes(OPENAPI_PATH));
  assert.ok(documented.includes(API_CATALOG_PATH));
});

test("every documented path has a real route handler", () => {
  for (const route of Object.keys(buildOpenApiDocument().paths)) {
    assert.ok(existsSync(routeFile(route)), `${route} has no route at ${routeFile(route)}`);
  }
});

test("every operation is described well enough for function calling", () => {
  const operations = Object.values(buildOpenApiDocument().paths).map((item) => item.get);
  const ids = operations.map((operation) => operation.operationId);

  assert.equal(new Set(ids).size, ids.length, "duplicate operationId");
  for (const operation of operations) {
    assert.match(operation.operationId, /^[a-z][A-Za-z]+$/u);
    assert.ok(operation.summary.length > 0, `${operation.operationId} has no summary`);
    assert.ok(operation.description.length >= 15, `${operation.operationId} is thin`);

    const ok = operation.responses["200"];
    assert.ok(ok, `${operation.operationId} has no 200 response`);
    const mediaTypes = Object.values(ok.content);
    assert.ok(mediaTypes.length > 0, `${operation.operationId} has no content type`);
    for (const media of mediaTypes) {
      assert.ok("type" in media.schema, `${operation.operationId} has an untyped schema`);
    }
  }
});

test("the API catalog and homepage Link header point at the OpenAPI document", () => {
  const [entry] = buildApiCatalog().linkset;

  assert.equal(entry?.anchor, absoluteUrl("/"));
  assert.equal(entry?.["service-desc"][0]?.href, absoluteUrl(OPENAPI_PATH));
  assert.ok(
    discoveryLinks.some((link) => link.startsWith(`<${OPENAPI_PATH}>; rel="service-desc"`)),
  );
  assert.ok(discoveryLinks.some((link) => link.includes('rel="api-catalog"')));
});
