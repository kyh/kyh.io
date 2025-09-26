# @kyh/tailwind-state

A Tailwind CSS plugin that provides expressive variants for working with stateful UI attributes. The plugin makes it easy to target interactive components that expose `data-state` or ARIA attributes without duplicating selectors.

## Installation

```bash
pnpm add @kyh/tailwind-state
```

Because the plugin imports `tailwindcss/plugin`, `tailwindcss` is listed as both a peer dependency and development dependency to avoid shipping it to consumers.

## Usage

Add the plugin to your Tailwind configuration. The examples below show both JavaScript and TypeScript configurations.

### `tailwind.config.js`

```js
import { createStatePlugin } from "@kyh/tailwind-state";

export default {
  content: ["./src/**/*.{ts,tsx,js,jsx}"],
  plugins: [createStatePlugin()],
};
```

### `tailwind.config.ts`

```ts
import type { Config } from "tailwindcss";
import { createStatePlugin } from "@kyh/tailwind-state";

export default {
  content: ["./src/**/*.{ts,tsx,js,jsx}"],
  plugins: [createStatePlugin()],
} satisfies Config;
```

## Variants

The plugin ships with a default map of common UI states (`open`, `closed`, `active`, `inactive`, `checked`, `selected`, `disabled`, `pressed`, `loading`, and more). Each state maps to a combination of data and ARIA selectors so your utilities work with both native elements and custom components.

### Element state

```html
<button class="state-open:bg-blue-500" data-state="open">Toggle</button>
```

Generates selectors that match `[data-state~="open"]`, `[aria-expanded="true"]`, `[aria-pressed="true"]`, and similar attributes.

### Group state

```html
<div class="group" data-state="open">
  <button class="group-state-open:bg-blue-500">Toggle</button>
</div>
```

### Peer state

```html
<button class="peer" data-state="loading">Submit</button>
<span class="peer-state-loading:opacity-50">Saving…</span>
```

### Custom values

You can target custom states with the bracket syntax, which falls back to the configured attribute name (defaults to `data-state`).

```html
<button class="state-[busy]:opacity-50" data-state="busy">Save</button>
```

## Configuration

`createStatePlugin` accepts an options object that lets you customize variant prefixes, attribute names, and the state map.

```ts
createStatePlugin({
  attribute: "data-mode",
  groupAttribute: "data-mode",
  peerAttribute: "data-mode",
  variantPrefix: "mode",
  groupVariantPrefix: "group-mode",
  peerVariantPrefix: "peer-mode",
  extend: {
    danger: (attribute) => [`[${attribute}~="danger"]`, `[aria-invalid="true"]`],
  },
  states: {
    // Override the built-in defaults entirely
    open: (attribute) => [`[${attribute}="expanded"]`],
  },
});
```

- `extend` merges additional states with the defaults.
- `states` replaces the default map completely.
- Attribute names are applied to dynamic variants (`state-[value]`) as well as the merged defaults.

