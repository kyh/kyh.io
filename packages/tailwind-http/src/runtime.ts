const DATA_ATTRIBUTE = "data-http";

export type HttpRequestConfig = {
  endpoint?: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  cacheMode?: string;
  cacheKey?: string;
  tokens: string[];
};

export type HttpDirectiveEventDetail = {
  element: HTMLElement;
  config: HttpRequestConfig;
  controller: AbortController;
  response?: Response;
  data?: string;
  error?: unknown;
  fromCache: boolean;
};

export type InitHttpDirectivesOptions = {
  root?: ParentNode & Node;
  fetchImpl?: typeof fetch;
  cache?: Map<string, Promise<CachePayload>>;
  onRequestStart?: (detail: HttpDirectiveEventDetail) => void;
  onRequestSuccess?: (detail: HttpDirectiveEventDetail) => void;
  onRequestError?: (detail: HttpDirectiveEventDetail) => void;
  onRequestFinish?: (detail: HttpDirectiveEventDetail) => void;
};

export type HttpDirectiveController = {
  refresh(target?: HTMLElement): Promise<void>;
  refetch(element: HTMLElement): Promise<void>;
  disconnect(): void;
};

type CachePayload = {
  data: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
};

type DirectiveState = {
  controller: AbortController;
  lastConfig?: HttpRequestConfig;
};

type EventPhase = "start" | "success" | "error" | "finish";

type BaseDetail = Pick<HttpDirectiveEventDetail, "element" | "config" | "controller">;

type EventCallback = (detail: HttpDirectiveEventDetail) => void;

export function initHttpDirectives(options: InitHttpDirectivesOptions = {}): HttpDirectiveController {
  const {
    root = document,
    fetchImpl = fetch,
    cache = new Map<string, Promise<CachePayload>>(),
    onRequestStart,
    onRequestSuccess,
    onRequestError,
    onRequestFinish,
  } = options;

  const callbacks: Record<EventPhase, EventCallback | undefined> = {
    start: onRequestStart,
    success: onRequestSuccess,
    error: onRequestError,
    finish: onRequestFinish,
  };

  const states = new WeakMap<HTMLElement, DirectiveState>();
  const tracked = new Set<HTMLElement>();

  const enqueueHandle = (node: unknown) => {
    if (node instanceof HTMLElement) {
      void handleElement(node);
    }
  };

  const enqueueRelease = (node: unknown) => {
    if (node instanceof HTMLElement) {
      releaseElement(node);
    }
  };

  const observer = new MutationObserver((mutations: MutationRecord[]) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes") {
        if (mutation.attributeName === DATA_ATTRIBUTE) {
          enqueueHandle(mutation.target);
        }
        continue;
      }

      for (const node of Array.from(mutation.addedNodes)) {
        enqueueHandle(node);

        if (node instanceof HTMLElement) {
          const nested = node.querySelectorAll<HTMLElement>(`[${DATA_ATTRIBUTE}]`);
          for (const nestedElement of Array.from(nested)) {
            enqueueHandle(nestedElement);
          }
        }
      }

      for (const node of Array.from(mutation.removedNodes)) {
        if (node instanceof HTMLElement) {
          const nested = node.querySelectorAll<HTMLElement>(`[${DATA_ATTRIBUTE}]`);
          for (const nestedElement of Array.from(nested)) {
            enqueueRelease(nestedElement);
          }
        }

        enqueueRelease(node);
      }
    }
  });

  const observerRoot = root instanceof Document ? root : (root as Node);
  observer.observe(observerRoot, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: [DATA_ATTRIBUTE],
  });

  const initial = collectHttpElements(root);
  for (const element of initial) {
    enqueueHandle(element);
  }

  async function refresh(target?: HTMLElement) {
    if (target) {
      if (target instanceof HTMLElement && target.hasAttribute(DATA_ATTRIBUTE)) {
        await handleElement(target, { force: true });
      }
      return;
    }

    const elements = collectHttpElements(root);
    await Promise.all(elements.map((element) => handleElement(element, { force: true })));
  }

  async function refetch(element: HTMLElement) {
    if (!(element instanceof HTMLElement)) {
      return;
    }

    await handleElement(element, { force: true });
  }

  function disconnect() {
    observer.disconnect();
    for (const element of tracked) {
      const state = states.get(element);
      state?.controller.abort();
    }
    tracked.clear();
  }

  async function handleElement(element: HTMLElement, { force = false } = {}) {
    const config = readConfig(element);
    if (!config) {
      releaseElement(element);
      return;
    }

    const existing = states.get(element);
    if (!force && existing?.lastConfig && shallowEqual(existing.lastConfig, config)) {
      return;
    }

    existing?.controller.abort();

    const controller = new AbortController();
    const state: DirectiveState = { controller, lastConfig: config };
    states.set(element, state);
    tracked.add(element);

    const base: BaseDetail = { element, config, controller };
    emit("start", { ...base, fromCache: false });

    try {
      const detail = await resolveDetail(base);
      if (controller.signal.aborted) {
        return;
      }

      element.dataset.httpStatus = detail.response?.status.toString() ?? "";
      emit("success", detail);
      emit("finish", detail);
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }

      const detail: HttpDirectiveEventDetail = { ...base, error, fromCache: false };
      emit("error", detail);
      emit("finish", detail);
    }
  }

  function releaseElement(element: HTMLElement) {
    const state = states.get(element);
    state?.controller.abort();
    states.delete(element);
    tracked.delete(element);
  }

  function emit(phase: EventPhase, detail: HttpDirectiveEventDetail) {
    const event = new CustomEvent<HttpDirectiveEventDetail>(`http:${phase}`, {
      detail,
      bubbles: false,
    });

    detail.element.dispatchEvent(event);
    callbacks[phase]?.(detail);
  }

  async function resolveDetail(base: BaseDetail): Promise<HttpDirectiveEventDetail> {
    const cacheKey = computeCacheKey(base.config);

    if (cacheKey) {
      const cached = cache.get(cacheKey);
      if (cached) {
        const payload = await cached;
        return payloadToDetail(payload, base, true);
      }

      const pending = fetchPayload(base);
      cache.set(
        cacheKey,
        pending
          .then((result) => result.payload)
          .catch((error) => {
            cache.delete(cacheKey);
            throw error;
          }),
      );

      const { detail } = await pending;
      return detail;
    }

    const { detail } = await fetchPayload(base);
    return detail;
  }

  async function fetchPayload(base: BaseDetail): Promise<{ detail: HttpDirectiveEventDetail; payload: CachePayload }> {
    const init: RequestInit = {
      method: base.config.method,
      headers: base.config.headers,
      body: base.config.body,
      signal: base.controller.signal,
    };

    if (base.config.cacheMode) {
      init.cache = base.config.cacheMode as RequestCache;
    }

    const response = await fetchImpl(base.config.url, init);
    const clone = response.clone();
    const data = await clone.text();

    const headers: Record<string, string> = {};
    response.headers.forEach((headerValue, headerKey) => {
      headers[headerKey] = headerValue;
    });

    const payload: CachePayload = {
      data,
      status: response.status,
      statusText: response.statusText,
      headers,
    };

    const detail: HttpDirectiveEventDetail = {
      ...base,
      response,
      data,
      fromCache: false,
    };

    return { detail, payload };
  }

  function payloadToDetail(payload: CachePayload, base: BaseDetail, fromCache: boolean): HttpDirectiveEventDetail {
    const response = new Response(payload.data, {
      status: payload.status,
      statusText: payload.statusText,
      headers: payload.headers,
    });

    return {
      ...base,
      response,
      data: payload.data,
      fromCache,
    };
  }

  return {
    refresh,
    refetch,
    disconnect,
  } satisfies HttpDirectiveController;
}

function collectHttpElements(root: ParentNode & Node): HTMLElement[] {
  const elements: HTMLElement[] = [];

  if (root instanceof HTMLElement && root.hasAttribute(DATA_ATTRIBUTE)) {
    elements.push(root);
  } else if (root instanceof Document && root.documentElement instanceof HTMLElement) {
    const docEl = root.documentElement;
    if (docEl.hasAttribute(DATA_ATTRIBUTE)) {
      elements.push(docEl);
    }
  }

  const scope = root instanceof Document ? root : (root as ParentNode);
  const nested = scope.querySelectorAll<HTMLElement>(`[${DATA_ATTRIBUTE}]`);
  elements.push(...Array.from(nested));

  return Array.from(new Set(elements));
}

function readConfig(element: HTMLElement): HttpRequestConfig | null {
  const tokens = (element.getAttribute(DATA_ATTRIBUTE) ?? "")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  const styles = getComputedStyle(element);
  const url = readCustomProperty(styles, "--http-url") ?? element.dataset.httpUrl;
  if (!url) {
    return null;
  }

  const methodProperty = readCustomProperty(styles, "--http-method") ?? element.dataset.httpMethod ?? "GET";
  const body = readCustomProperty(styles, "--http-body");
  const cacheMode = readCustomProperty(styles, "--http-cache") ?? element.dataset.httpCache;
  const cacheKey = readCustomProperty(styles, "--http-cache-key") ?? element.dataset.httpCacheKey;
  const endpoint = readCustomProperty(styles, "--http-endpoint") ?? tokens[0];

  const headers: Record<string, string> = {};
  for (let index = 0; index < styles.length; index++) {
    const propertyName = styles.item(index);
    if (propertyName.startsWith("--http-header-")) {
      const headerName = propertyName.replace("--http-header-", "");
      const value = styles.getPropertyValue(propertyName).trim();
      if (value) {
        headers[headerName] = value;
      }
    }
  }

  return {
    endpoint: endpoint ?? undefined,
    url,
    method: methodProperty.toUpperCase(),
    headers,
    body,
    cacheMode,
    cacheKey,
    tokens,
  };
}

function computeCacheKey(config: HttpRequestConfig): string | null {
  const mode = config.cacheMode?.toLowerCase();
  if (!mode || mode === "no-store" || mode === "reload" || mode === "no-cache") {
    return null;
  }

  if (config.cacheKey) {
    return config.cacheKey;
  }

  const headerKey = Object.entries(config.headers)
    .map(([key, value]) => `${key}:${value}`)
    .sort()
    .join("|");

  return `${config.method}:${config.url}:${headerKey}:${config.body ?? ""}`;
}

function readCustomProperty(styles: CSSStyleDeclaration, name: string): string | undefined {
  const value = styles.getPropertyValue(name);
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isAbortError(error: unknown): boolean {
  return (
    (typeof DOMException !== "undefined" && error instanceof DOMException && error.name === "AbortError") ||
    (typeof error === "object" && error !== null && "name" in error && (error as { name: string }).name === "AbortError")
  );
}

function shallowEqual(a?: HttpRequestConfig, b?: HttpRequestConfig): boolean {
  if (!a || !b) {
    return false;
  }

  const headersEqual =
    Object.keys(a.headers).length === Object.keys(b.headers).length &&
    Object.entries(a.headers).every(([key, value]) => b.headers[key] === value);

  return (
    headersEqual &&
    a.url === b.url &&
    a.method === b.method &&
    a.body === b.body &&
    a.cacheMode === b.cacheMode &&
    a.cacheKey === b.cacheKey &&
    a.endpoint === b.endpoint &&
    a.tokens.join(" ") === b.tokens.join(" ")
  );
}
