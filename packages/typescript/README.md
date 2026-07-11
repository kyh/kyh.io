# @kyh/tsconfig

Shared TypeScript configs.

## Install

```bash
pnpm add -D @kyh/tsconfig
```

## Usage

```jsonc
// tsconfig.json
{
  "extends": "@kyh/tsconfig/base.json",
  "include": ["src"]
}
```

Configs:

- `base.json` — strict, `noUncheckedIndexedAccess`, bundler resolution, `noEmit`
- `internal-package.json` — base + declaration-only emit for internal workspace packages
