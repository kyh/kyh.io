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
  "include": ["src"],
}
```

Configs:

- `base.json` — strict, `noUncheckedIndexedAccess`, bundler resolution, `noEmit`

`base.json` is the only config, and it's for **workspace packages and apps**. Point their
`exports` straight at source (`"." : "./src/index.ts"`) and give them no build step: tsserver
and the bundler both follow `exports` and read the `.ts`, so emitting `.d.ts` for them produces
artifacts nothing resolves.

Packages **published to npm** should not extend this at all — they inline their own tsconfig so
they build without depending on a shared workspace config.
