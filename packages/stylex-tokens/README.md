# @repo/stylex-tokens

Tailwind v4.3.3's design scale — spacing, radii, type, colors, easings — as StyleX
constants. Consumed by the apps that migrated off Tailwind so their numbers stay
byte-identical to what Tailwind used to emit.

```ts
import { colors, radii, spacing } from "@repo/stylex-tokens/tokens.stylex";

const styles = stylex.create({
  card: {
    backgroundColor: colors.stone100,
    borderRadius: radii.lg,
    padding: spacing[4],
  },
});
```

Use bracket notation for numeric names: `spacing[4]`, `fontSizes["2xl"]`.

## Provenance

Vendored verbatim from [`tailwind-stylex@0.1.1`](https://github.com/aidenybai/tailwind-stylex)
(MIT, © Aiden Bai — see `LICENSE`). Generated output, not hand-written: **do not edit**.

Vendored rather than depended on because these values are a frozen snapshot of what
Tailwind emitted at migration time. There is no upstream to track — the apps left
Tailwind, so the scale should never move again. Re-vendor only to add a token group
the apps have started needing.

## Wiring

The file uses `stylex.defineConsts`, so each consuming app's StyleX compiler has to
process it:

- PostCSS (Next): add `"../../packages/stylex-tokens/tokens.stylex.js"` to `include`
- unplugin (Vite): add `"@repo/stylex-tokens"` to `externalPackages`
