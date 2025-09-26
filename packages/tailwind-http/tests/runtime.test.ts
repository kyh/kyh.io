import { afterEach, describe, expect, it, vi } from "vitest";

import { initHttpDirectives } from "../src/runtime";
import type { HttpDirectiveEventDetail } from "../src/runtime";

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), 0);
  });
}

describe("initHttpDirectives", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  type ElementMetadata = {
    tokens?: string;
    url?: string;
    method?: string;
    cache?: string;
    cacheKey?: string;
  };

  function createHttpElement(metadata: ElementMetadata = {}) {
    const element = document.createElement("button");
    element.setAttribute("data-http", metadata.tokens ?? "users");
    element.style.setProperty("--http-url", metadata.url ?? "/api/users");
    element.style.setProperty("--http-method", metadata.method ?? "GET");
    if (metadata.cache) {
      element.style.setProperty("--http-cache", metadata.cache);
    }
    if (metadata.cacheKey) {
      element.style.setProperty("--http-cache-key", metadata.cacheKey);
    }
    return element;
  }

  it("performs a fetch request and emits events", async () => {
    const element = createHttpElement();
    element.style.setProperty("--http-header-authorization", "Bearer token");
    document.body.appendChild(element);

    const success = vi.fn();
    element.addEventListener("http:success", (event) => {
      const detail = (event as CustomEvent<HttpDirectiveEventDetail>).detail;
      success(detail);
    });

    const fetchMock = vi.fn<Promise<Response>, [RequestInfo, RequestInit?]>(() =>
      Promise.resolve(
        new Response("{\"ok\":true}", {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const controller = initHttpDirectives({ root: document, fetchImpl: fetchMock });

    await flushMicrotasks();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, rawInit]: [RequestInfo, RequestInit?] = fetchMock.mock.calls[0];
    const init: RequestInit = rawInit ?? {};

    const method = init.method ?? "GET";
    expect(method).toBe("GET");
    const headerInit = init.headers;
    let normalizedHeaders: Record<string, string> = {};
    if (headerInit instanceof Headers) {
      headerInit.forEach((value, key) => {
        normalizedHeaders[key] = value;
      });
    } else if (Array.isArray(headerInit)) {
      for (const entry of headerInit) {
        const [key, value] = entry;
        normalizedHeaders[key] = value;
      }
    } else if (headerInit) {
      normalizedHeaders = headerInit;
    }
    expect(normalizedHeaders).toMatchObject({ authorization: "Bearer token" });

    await flushMicrotasks();
    expect(element.dataset.httpStatus).toBe("200");
    expect(success).toHaveBeenCalledTimes(1);
    const detail = success.mock.calls[0][0] as HttpDirectiveEventDetail;
    expect(detail.fromCache).toBe(false);
    controller.disconnect();
  });

  it("shares cached responses between matching elements", async () => {
    const first = createHttpElement({ cache: "force-cache" });
    const second = createHttpElement({ cache: "force-cache" });
    document.body.append(first, second);

    const secondSuccess = vi.fn();
    second.addEventListener("http:success", (event) => {
      const detail = (event as CustomEvent<HttpDirectiveEventDetail>).detail;
      secondSuccess(detail);
    });

    const fetchMock = vi.fn<Promise<Response>, [RequestInfo, RequestInit?]>(() =>
      Promise.resolve(
        new Response("ok", {
          status: 201,
          headers: { "x-cache": "miss" },
        }),
      ),
    );

    const cacheController = initHttpDirectives({ root: document, fetchImpl: fetchMock });

    await flushMicrotasks();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await flushMicrotasks();
    expect(second.dataset.httpStatus).toBe("201");
    expect(secondSuccess).toHaveBeenCalled();
    const detail = secondSuccess.mock.calls[secondSuccess.mock.calls.length - 1][0] as HttpDirectiveEventDetail;
    expect(detail.fromCache).toBe(true);
    cacheController.disconnect();
  });

  it("observes newly added elements", async () => {
    const fetchMock = vi.fn<Promise<Response>, [RequestInfo, RequestInit?]>(() =>
      Promise.resolve(new Response("done", { status: 204 })),
    );
    const observerController = initHttpDirectives({ root: document, fetchImpl: fetchMock });

    const dynamic = createHttpElement({ cache: "no-store" });
    document.body.appendChild(dynamic);

    await flushMicrotasks();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    observerController.disconnect();
  });

  it("aborts in-flight requests when elements are removed", async () => {
    const element = createHttpElement({ cache: "no-store" });
    document.body.appendChild(element);

    const aborted = vi.fn();
    const fetchMock = vi.fn<Promise<Response>, [RequestInfo, RequestInit?]>((_: RequestInfo, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => {
            aborted();
            reject(new DOMException("Aborted", "AbortError"));
          },
          { once: true },
        );
      }),
    );

    const controller = initHttpDirectives({ root: document, fetchImpl: fetchMock });

    await flushMicrotasks();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    element.remove();
    await flushMicrotasks();
    expect(aborted).toHaveBeenCalledTimes(1);

    controller.disconnect();
  });
});
