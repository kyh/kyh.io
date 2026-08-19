# @kyh/oxlint

Oxlint plugins and shared lint tooling.

## `@kyh/oxlint/anti-slop`

Opinionated Oxlint rules that reject low-evidence and low-signal TypeScript patterns. Fork of [dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop) (MIT), published so every project consumes one canonical copy instead of a vendored one.

### Divergences from upstream

- `no-runtime-typeof` exempts host-global existence checks (`typeof window === "undefined"` against `window`, `document`, `navigator`, `process`, `globalThis`, `self`) — environment detection narrows no value and has no boundary to parse at.

### Usage

```bash
pnpm add -D @kyh/oxlint
```

`.oxlintrc.json`:

```json
{
  "jsPlugins": [{ "name": "anti-slop", "specifier": "@kyh/oxlint/anti-slop" }],
  "rules": {
    "anti-slop/no-chained-type-assertions": "error",
    "anti-slop/no-conditional-empty-object-spread": "error",
    "anti-slop/no-known-value-widening": "error",
    "anti-slop/no-module-mocking": "error",
    "anti-slop/no-object-parameters": "error",
    "anti-slop/no-reflect-apply": "error",
    "anti-slop/no-reflect-get": "error",
    "anti-slop/no-runtime-typeof": "error",
    "anti-slop/no-shape-in-symbol-names": "error",
    "anti-slop/no-unknown-parameters": "error",
    "anti-slop/no-unknown-returns": "error",
    "anti-slop/no-unknown-type-aliases": "error",
    "anti-slop/no-unsafe-dictionary-type": "error",
    "anti-slop/no-widen-then-assert": "error",
    "anti-slop/require-safety-comment-for-type-assertion": "error"
  }
}
```

Rule docs: see upstream's [README](https://github.com/dmmulroy/anti-slop#rules).

### Notes

- Ships TS source directly; oxlint's plugin loader handles it. No build step.
- This package is excluded from the monorepo's own anti-slop lint and oxfmt: rule implementations inspect untyped ESTree nodes and options (which the rules themselves forbid), and keeping upstream formatting keeps sync diffs clean.
- Tests run each `anti-slop/rules/*.test.ts` under Node's native type stripping; `RuleTester` throws on failure.
