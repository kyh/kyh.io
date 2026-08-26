# @repo/tailwind-compat

What the apps kept when they left Tailwind: its design scale as StyleX constants, and
the two stylesheets the compiler used to generate for them. Everything here is a frozen
snapshot of Tailwind v4.3.3 output so migrated apps render byte-identically.

## Tokens

```ts
import { colors, radii, spacing } from "@repo/tailwind-compat/tokens.stylex";

const styles = stylex.create({
  card: { backgroundColor: colors.stone100, borderRadius: radii.lg, padding: spacing[4] },
});
```

Bracket notation for numeric names: `spacing[4]`, `fontSizes["2xl"]`.

## Stylesheets

Import at the top of the app's own stylesheet, before its rules:

```css
@import "@repo/tailwind-compat/preflight.css";
@import "@repo/tailwind-compat/forms.css"; /* only if the app used @plugin "@tailwindcss/forms" */
```

`preflight.css` is required. Deleting Tailwind deletes its reset, and without this every
browser default returns — heading sizes, list bullets, button chrome, inline images. Both
sheets sit in `@layer base` so app CSS and StyleX outrank them, matching Tailwind's order.

`forms.css` resolves the plugin's `--tw-ring-*`/`--tw-shadow` indirection to the concrete
values it produced at default settings, so no `@property` declarations are needed.

## Provenance

`tokens.stylex.*` is vendored from [`tailwind-stylex@0.1.1`](https://github.com/aidenybai/tailwind-stylex)
(MIT, © Aiden Bai — see `LICENSE`). The stylesheets are Tailwind's own compiler output.
All of it is **generated: do not edit.**

Vendored rather than depended on because these values are a snapshot, not a moving
target — the apps left Tailwind, so the scale should never change again.

## Wiring

`tokens.stylex.js` ships uncompiled, so each app's StyleX compiler must process it:

- **PostCSS (Next)**: add `"../../packages/tailwind-compat/tokens.stylex.js"` to `include`
- **unplugin (Vite)**: add `"@repo/tailwind-compat"` to `externalPackages`
