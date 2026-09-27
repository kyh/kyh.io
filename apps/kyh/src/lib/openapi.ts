import { absoluteUrl, siteConfig } from "@/lib/config";

/** The JSON Schema subset this document uses. */
interface SchemaObject {
  type: "string" | "integer" | "object" | "array";
  description?: string;
  format?: string;
  properties?: Record<string, SchemaObject>;
  required?: string[];
  items?: SchemaObject;
}

interface MediaType {
  schema: SchemaObject;
}

interface ResponseObject {
  description: string;
  headers?: Record<string, { description: string; schema: { type: "string" } }>;
  content: Record<string, MediaType>;
}

export interface Operation {
  operationId: string;
  summary: string;
  description: string;
  tags: string[];
  parameters?: {
    name: string;
    in: "header";
    required: false;
    description: string;
    schema: { type: "string" };
  }[];
  responses: Record<string, ResponseObject>;
}

export interface OpenApiDocument {
  openapi: "3.1.0";
  info: {
    title: string;
    version: string;
    description: string;
    contact: { email: string; url: string };
  };
  servers: { url: string }[];
  tags: { name: string; description: string }[];
  paths: Record<string, { get: Operation }>;
  components: { schemas: Record<string, SchemaObject> };
}

export const OPENAPI_PATH = "/openapi.json";
export const API_CATALOG_PATH = "/.well-known/api-catalog";

const text = (description: string): MediaType => ({ schema: { description, type: "string" } });

const varyHeader: ResponseObject["headers"] = {
  Vary: {
    description: "Always includes `Accept`: the body depends on content negotiation.",
    schema: { type: "string" },
  },
};

/**
 * Describes only the GET endpoints this site really serves. kyh.io is a personal
 * site with no write API, auth or OAuth; listing anything else here would send
 * agents to endpoints that 404.
 */
export const buildOpenApiDocument = (): OpenApiDocument => ({
  components: {
    schemas: {
      Problem: {
        description: "RFC 9457 problem details, returned for unknown `/api/*` paths.",
        properties: {
          detail: { type: "string" },
          instance: { type: "string" },
          status: { type: "integer" },
          title: { type: "string" },
          type: { format: "uri", type: "string" },
        },
        required: ["type", "title", "status"],
        type: "object",
      },
    },
  },
  info: {
    contact: { email: siteConfig.email, url: absoluteUrl("/contact") },
    description: `Read-only, machine-readable views of ${siteConfig.siteName}, the personal site of ${siteConfig.name}. Every endpoint is an unauthenticated GET. There is no write API. Unknown \`/api/*\` paths return \`application/problem+json\`; other unknown paths return a markdown 404.`,
    title: `${siteConfig.siteName} agent endpoints`,
    version: "1.0.0",
  },
  openapi: "3.1.0",
  paths: {
    "/": {
      get: {
        description:
          "Returns HTML by default. Send `Accept: text/markdown` to receive the same bio, work history and project list as markdown.",
        operationId: "getHome",
        parameters: [
          {
            description: "`text/markdown` selects the markdown representation.",
            in: "header",
            name: "Accept",
            required: false,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            content: {
              "text/html": text("The homepage."),
              "text/markdown": text("The homepage as markdown, identical to `/markdown`."),
            },
            description: "The homepage, negotiated on `Accept`.",
            headers: varyHeader,
          },
        },
        summary: "Homepage (HTML or markdown)",
        tags: ["content"],
      },
    },
    [API_CATALOG_PATH]: {
      get: {
        description: "RFC 9727 API catalog, as an RFC 9264 linkset pointing at this document.",
        operationId: "getApiCatalog",
        responses: {
          "200": {
            content: {
              "application/linkset+json": {
                schema: {
                  properties: { linkset: { items: { type: "object" }, type: "array" } },
                  required: ["linkset"],
                  type: "object",
                },
              },
            },
            description: "The API catalog.",
          },
        },
        summary: "API catalog",
        tags: ["discovery"],
      },
    },
    "/llms.txt": {
      get: {
        description:
          "llmstxt.org index: what the site covers, when to use it, and links to every page and project.",
        operationId: "getLlmsTxt",
        responses: {
          "200": {
            content: { "text/plain": text("llms.txt formatted markdown.") },
            description: "The agent index.",
          },
        },
        summary: "Agent index (llms.txt)",
        tags: ["discovery"],
      },
    },
    "/markdown": {
      get: {
        description:
          "The whole homepage as a single markdown document: bio, work history, projects and contact links.",
        operationId: "getMarkdown",
        responses: {
          "200": {
            content: { "text/markdown": text("The homepage as markdown.") },
            description: "Markdown view of the homepage.",
            headers: varyHeader,
          },
        },
        summary: "Homepage as markdown",
        tags: ["content"],
      },
    },
    [OPENAPI_PATH]: {
      get: {
        description: "This OpenAPI 3.1 document.",
        operationId: "getOpenApi",
        responses: {
          "200": {
            content: { "application/json": { schema: { type: "object" } } },
            description: "The OpenAPI document.",
          },
        },
        summary: "OpenAPI description",
        tags: ["discovery"],
      },
    },
    "/robots.txt": {
      get: {
        description: "Crawl rules plus Content-Signal AI usage preferences.",
        operationId: "getRobotsTxt",
        responses: {
          "200": {
            content: { "text/plain": text("robots.txt directives.") },
            description: "Crawl rules.",
          },
        },
        summary: "robots.txt",
        tags: ["discovery"],
      },
    },
    "/sitemap.xml": {
      get: {
        description: "Every canonical HTML page on the site.",
        operationId: "getSitemap",
        responses: {
          "200": {
            content: { "application/xml": text("sitemaps.org XML.") },
            description: "The sitemap.",
          },
        },
        summary: "Sitemap",
        tags: ["discovery"],
      },
    },
  },
  servers: [{ url: siteConfig.url }],
  tags: [
    { description: "The site's content in machine-readable form.", name: "content" },
    { description: "Indexes that describe what the site serves.", name: "discovery" },
  ],
});

/** RFC 9727 catalog, serialized as an RFC 9264 linkset. */
export const buildApiCatalog = () => ({
  linkset: [
    {
      anchor: absoluteUrl("/"),
      "service-desc": [{ href: absoluteUrl(OPENAPI_PATH), type: "application/json" }],
      "service-doc": [{ href: absoluteUrl("/agents"), type: "text/html" }],
    },
  ],
});

/** Advertised on the homepage so agents can find the description without guessing paths. */
export const discoveryLinks = [
  `<${OPENAPI_PATH}>; rel="service-desc"; type="application/json"`,
  `<${API_CATALOG_PATH}>; rel="api-catalog"`,
];
