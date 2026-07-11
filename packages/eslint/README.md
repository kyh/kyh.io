# @kyh/eslint-config

Shared ESLint flat configs.

## Install

```bash
pnpm add -D @kyh/eslint-config
```

The configs import their tooling from the consumer's dependency graph, so also install:

```bash
pnpm add -D eslint typescript-eslint @eslint/js @eslint/compat eslint-plugin-import eslint-plugin-turbo
# for ./react
pnpm add -D eslint-plugin-react eslint-plugin-react-hooks
# for ./nextjs
pnpm add -D @next/eslint-plugin-next
```

## Usage

```js
// eslint.config.js
import baseConfig from "@kyh/eslint-config/base";

export default [...baseConfig];
```

Exports:

- `@kyh/eslint-config/base` — TypeScript + import + turbo rules, respects your `.gitignore`
- `@kyh/eslint-config/react` — base + React/hooks rules
- `@kyh/eslint-config/nextjs` — react + Next.js rules
