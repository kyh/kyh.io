import { describe, expect, it } from "vitest";
import type { PluginAPI } from "tailwindcss/types/config";

import { httpPlugin } from "../src/plugin";
import type { HttpEndpointDefinition } from "../src/plugin";

describe("httpPlugin", () => {
  const endpoints: Record<string, HttpEndpointDefinition> = {
    users: {
      url: "/api/users",
      method: "get",
      headers: {
        Authorization: "Bearer token",
      },
    },
    createUser: {
      url: "/api/users",
      method: "post",
      cache: "force-cache",
      cacheKey: "create-user",
      body: "{\"role\":\"admin\"}",
    },
  };

  function invokePlugin() {
    const pluginFactory = httpPlugin();
    const handler = ("handler" in pluginFactory ? pluginFactory.handler : pluginFactory) as (api: PluginAPI) => void;

    type UtilityHandler = (value: unknown, ctx: { modifier?: string }) => Record<string, string>;

    const registeredVariants = new Map<string, (value: string) => string>();
    const registeredUtilities = new Map<string, UtilityHandler>();
    let endpointValues: Record<string, HttpEndpointDefinition> | undefined;

    const isUtilityHandler = (value: unknown): value is UtilityHandler => typeof value === "function";
    const isEndpointRecord = (value: unknown): value is Record<string, HttpEndpointDefinition> =>
      Boolean(value) &&
      typeof value === "object" &&
      value !== null &&
      Object.values(value).every(
        (entry) => Boolean(entry) && typeof entry === "object" && entry !== null && "url" in entry,
      );

    handler({
      matchVariant(name: string, generator: (value: string) => string) {
        registeredVariants.set(name, generator);
      },
      matchUtilities(utilities: Record<string, unknown>, options?: Parameters<PluginAPI["matchUtilities"]>[1]) {
        for (const [name, utility] of Object.entries(utilities)) {
          if (isUtilityHandler(utility)) {
            registeredUtilities.set(name, utility);
          }
        }

        if (options?.values && isEndpointRecord(options.values)) {
          endpointValues = options.values;
        }
      },
      theme(path: string) {
        if (path === "http.endpoints") {
          return endpoints;
        }
        return undefined;
      },
      e(value: unknown) {
        return String(value);
      },
    } as unknown as PluginAPI);

    return { registeredVariants, registeredUtilities, endpointValues };
  }

  it("registers the http variant", () => {
    const { registeredVariants } = invokePlugin();
    expect(Array.from(registeredVariants.keys())).toContain("http");
    const httpVariant = registeredVariants.get("http");
    expect(httpVariant).toBeDefined();
    expect(httpVariant?.("users")).toBe('[data-http~="users"]');
  });

  it("creates utilities that set HTTP metadata", () => {
    const { registeredUtilities, endpointValues } = invokePlugin();
    expect(Array.from(registeredUtilities.keys())).toEqual(
      expect.arrayContaining(["http-url", "http-method", "http-header", "http-endpoint"]),
    );

    const urlUtility = registeredUtilities.get("http-url");
    expect(urlUtility?.("/api/posts", {})).toEqual({ "--http-url": "/api/posts" });

    const methodUtility = registeredUtilities.get("http-method");
    expect(methodUtility?.("post", {})).toEqual({ "--http-method": "POST" });

    const headerUtility = registeredUtilities.get("http-header");
    expect(headerUtility?.("Bearer", { modifier: "Authorization" })).toEqual({
      "--http-header-authorization": "Bearer",
    });

    const endpointUtility = registeredUtilities.get("http-endpoint");
    expect(endpointValues).toBeDefined();
    expect(endpointUtility).toBeDefined();
    if (!endpointValues || !endpointUtility) {
      throw new Error("Endpoint utilities were not registered");
    }

    const result = endpointUtility(endpointValues.users, { modifier: "users" });
    expect(result).toMatchObject({
      "--http-endpoint": "users",
      "--http-url": "/api/users",
      "--http-method": "GET",
      "--http-header-authorization": "Bearer token",
    });
  });

  it("exposes defaults when options provide endpoints", () => {
    const pluginFactory = httpPlugin({ endpoints });
    const configuration = pluginFactory.config;
    const configuredEndpoints =
      configuration &&
      typeof configuration === "object" &&
      "theme" in configuration &&
      configuration.theme &&
      typeof configuration.theme === "object" &&
      "http" in configuration.theme &&
      configuration.theme.http &&
      typeof configuration.theme.http === "object"
        ? (configuration.theme.http as { endpoints?: Record<string, HttpEndpointDefinition> }).endpoints
        : undefined;

    expect(configuredEndpoints ?? {}).toMatchObject(endpoints);
  });
});
