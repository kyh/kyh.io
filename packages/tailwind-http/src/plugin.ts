import plugin from "tailwindcss/plugin";
import type { PluginAPI } from "tailwindcss/types/config";

export type HttpEndpointDefinition = {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  cache?: RequestCache | "no-cache" | "reload" | "force-cache" | "only-if-cached";
  cacheKey?: string;
};

export type HttpPluginOptions = {
  endpoints?: Record<string, HttpEndpointDefinition>;
};

type ThemeEndpoints = Record<string, HttpEndpointDefinition>;

type HttpUtilityGenerator = (value: unknown, context: { modifier?: string | null }) => Record<string, string>;

const DEFAULT_METHOD = "GET";

function normaliseHeaders(headers: Record<string, string> | undefined): Record<string, string> {
  if (!headers) {
    return {};
  }

  const entries: [string, string][] = [];
  for (const [key, value] of Object.entries(headers)) {
    entries.push([key.toLowerCase(), value]);
  }

  return Object.fromEntries(entries);
}

function endpointToCustomProperties(
  endpoint: HttpEndpointDefinition,
  modifier?: string,
): Record<string, string> {
  const properties: Record<string, string> = {};

  if (modifier) {
    properties["--http-endpoint"] = modifier;
  }

  if (endpoint.url) {
    properties["--http-url"] = endpoint.url;
  }

  const method = (endpoint.method ?? DEFAULT_METHOD).toUpperCase();
  properties["--http-method"] = method;

  if (endpoint.body) {
    properties["--http-body"] = endpoint.body;
  }

  if (endpoint.cache) {
    properties["--http-cache"] = endpoint.cache;
  }

  if (endpoint.cacheKey) {
    properties["--http-cache-key"] = endpoint.cacheKey;
  }

  for (const [header, value] of Object.entries(normaliseHeaders(endpoint.headers))) {
    properties[`--http-header-${header}`] = value;
  }

  return properties;
}

function createHeaderUtility(): HttpUtilityGenerator {
  return (value, { modifier }) => {
    if (!modifier || typeof modifier !== "string") {
      return {};
    }

    const headerName = modifier.replace(/_/g, "-").toLowerCase();
    return {
      [`--http-header-${headerName}`]: String(value),
    };
  };
}

function isEndpointDefinition(value: unknown): value is HttpEndpointDefinition {
  return Boolean(value) && typeof value === "object" && value !== null && "url" in value;
}

function isEndpointRecord(value: unknown): value is ThemeEndpoints {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  for (const entry of Object.values(value as Record<string, unknown>)) {
    if (!isEndpointDefinition(entry)) {
      return false;
    }
  }

  return true;
}

function createEndpointUtility(): HttpUtilityGenerator {
  return (endpoint, { modifier }) => {
    if (!isEndpointDefinition(endpoint)) {
      return {};
    }

    return endpointToCustomProperties(endpoint, typeof modifier === "string" ? modifier : undefined);
  };
}

function resolveThemeEndpoints(api: PluginAPI, options: HttpPluginOptions): ThemeEndpoints {
    const themeValue = api.theme("http.endpoints");
    const fromTheme = isEndpointRecord(themeValue) ? themeValue : {};
  const merged: ThemeEndpoints = { ...fromTheme };

  if (options.endpoints) {
    for (const [key, value] of Object.entries(options.endpoints)) {
      merged[key] = value;
    }
  }

  return merged;
}

export const httpPlugin = plugin.withOptions<HttpPluginOptions>(
  (options = {}) => {
    return function setupHttpPlugin(api) {
      const endpoints = resolveThemeEndpoints(api, options);

      api.matchVariant("http", (value) => `[data-http~="${api.e(String(value))}"]`);

      api.matchUtilities(
        {
          "http-url": (value) => ({ "--http-url": String(value) }),
          "http-method": (value) => ({ "--http-method": String(value).toUpperCase() || DEFAULT_METHOD }),
          "http-body": (value) => ({ "--http-body": String(value) }),
          "http-cache": (value) => ({ "--http-cache": String(value) }),
          "http-cache-key": (value) => ({ "--http-cache-key": String(value) }),
          "http-header": createHeaderUtility(),
        },
        {
          type: "any",
        },
      );

      api.matchUtilities(
        {
          "http-endpoint": createEndpointUtility(),
        },
        {
          values: endpoints,
          type: "any",
        },
      );
    } satisfies (api: PluginAPI) => void;
  },
  (options = {}) => ({
    theme: {
      http: {
        endpoints: options.endpoints ?? {},
      },
    },
  }),
);

export type { PluginAPI as TailwindPluginAPI };
