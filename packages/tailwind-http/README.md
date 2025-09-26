# `@kyh/tailwind-http`

An opinionated Tailwind CSS plugin and tiny runtime that turn semantic `data-http` attributes into declarative HTTP requests. It ships with a composable variant for targeting request-driven UI and utilities that describe HTTP metadata through CSS custom properties. A lightweight runtime consumes those properties to orchestrate fetch lifecycles, caching, and framework-friendly hooks.

## Installation

```bash
pnpm add @kyh/tailwind-http
```

Peer dependencies:

- `tailwindcss` `^3.4.0`

## Tailwind setup

Register the plugin in your `tailwind.config.ts` and describe any reusable endpoints under `theme.http.endpoints`.

```ts
// tailwind.config.ts
import type { Config } from "tailwindcss";
import { httpPlugin } from "@kyh/tailwind-http/plugin";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,js,jsx,mdx}"],
  theme: {
    extend: {
      http: {
        endpoints: {
          users: {
            url: "/api/users",
            method: "GET",
            headers: {
              authorization: "Bearer TOKEN",
            },
          },
          postUser: {
            url: "/api/users",
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            body: "{\"role\":\"admin\"}",
          },
        },
      },
    },
  },
  plugins: [httpPlugin()],
};

export default config;
```

### Generated utilities

- `http-url-[value]` – writes the `value` into `--http-url`.
- `http-method-[value]` – uppercases `value` into `--http-method`.
- `http-header-{name}-[value]` – assigns `--http-header-{name}`.
- `http-body-[value]` – serializes `value` into `--http-body`.
- `http-cache-[value]` and `http-cache-key-[value]` – control runtime caching semantics.
- `http-endpoint-{name}` – emits the endpoint metadata defined in `theme.http.endpoints.{name}`.
- Variant `http-{token}:...` selects `[data-http~="{token}"]`.

Use them directly or layer them through components:

```html
<button
  data-http="users"
  class="http-endpoint-users http-method-GET http-header-authorization-[Bearer_TOKEN]"
>
  Refresh users
</button>
```

## Runtime usage

Call `initHttpDirectives()` once on the client. It will scan the provided root, hydrate every element that exposes `data-http`, and keep watch for future mutations.

```ts
import { useEffect } from "react";
import { initHttpDirectives } from "@kyh/tailwind-http/runtime";

export function UsersButton() {
  useEffect(() => {
    const controller = initHttpDirectives();
    return () => controller.disconnect();
  }, []);

  return (
    <button data-http="users" className="http-endpoint-users">
      Refresh users
    </button>
  );
}
```

### Fetch lifecycle hooks

The initializer accepts optional callbacks and dispatches DOM events for fine-grained control.

```ts
initHttpDirectives({
  onRequestStart(detail) {
    console.log("starting", detail.config.url);
  },
  onRequestSuccess(detail) {
    console.log("success", detail.response.status);
  },
  onRequestError(detail) {
    console.error("failed", detail.error);
  },
});
```

Each request emits `CustomEvent`s on the source element (`http:start`, `http:success`, `http:error`, `http:finish`). The `detail` payload includes:

```ts
interface HttpDirectiveEventDetail {
  element: HTMLElement;
  config: HttpRequestConfig;
  controller: AbortController;
  response?: Response;
  data?: string;
  error?: unknown;
  fromCache: boolean;
}
```

## Framework integration tips

- Listen for the DOM events to trigger local UI state changes.
- Provide a custom `fetchImpl` (e.g., `ky.fetch`) or pass a memoized cache map for SSR hydration.
- Combine with the Tailwind variant (`http-users:bg-blue-500`) to restyle UI while a request is in-flight or once it resolves.

## Testing

This package is covered by Vitest unit tests. Run them locally with:

```bash
pnpm --filter @kyh/tailwind-http test
```

## License

MIT © KYH
